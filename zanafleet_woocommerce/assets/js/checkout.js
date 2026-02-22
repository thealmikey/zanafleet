/**
 * ZanaFleet Checkout JavaScript
 * Handles dynamic delivery quote calculation on checkout
 */

(function ($) {
    'use strict';

    let currentQuote = null;
    let quoteTimer = null;

    // Initialize on document ready
    $(document).ready(function () {
        initDeliveryQuote();
    });

    /**
     * Initialize delivery quote functionality
     */
    function initDeliveryQuote() {
        const $form = $('form.checkout');
        
        if (!$form.length) {
            return;
        }

        // Listen for address changes
        $form.on('change', '#billing_address_1, #billing_address_2, #billing_city, #billing_postcode, #shipping_address_1, #shipping_address_2, #shipping_city, #shipping_postcode, #zanafleet_vehicle_type', debounce(function () {
            calculateQuote();
        }, 1000));

        // Calculate on page load if address exists
        if ($('#shipping_address_1').val() || $('#billing_address_1').val()) {
            calculateQuote();
        }
    }

    /**
     * Calculate delivery quote
     */
    function calculateQuote() {
        const $container = $('#zanafleet-delivery-options');
        const $loading = $('#zanafleet-quote-loading');
        const $display = $('#zanafleet-quote-display');
        const $error = $('#zanafleet-quote-error');

        // Get address
        const address1 = $('#shipping_address_1').val() || $('#billing_address_1').val();
        const city = $('#shipping_city').val() || $('#billing_city').val();
        
        if (!address1 || !city) {
            $display.hide();
            $error.show().text(zanafleetData.i18n.noAddress);
            return;
        }

        // Show loading
        $loading.show();
        $display.hide();
        $error.hide();

        // Get coordinates if available
        const latitude = $('#shipping_latitude').val() || $('#billing_latitude').val() || '';
        const longitude = $('#shipping_longitude').val() || $('#billing_longitude').val() || '';

        // Make AJAX request
        $.ajax({
            url: zanafleetData.ajaxUrl,
            method: 'POST',
            data: {
                action: 'zanafleet_get_quote',
                nonce: zanafleetData.nonce,
                address: address1 + ', ' + city,
                latitude: latitude,
                longitude: longitude
            },
            success: function (response) {
                $loading.hide();
                
                if (response.success) {
                    currentQuote = response.data;
                    showQuote(response.data);
                    
                    // Update hidden fields
                    $('<input>').attr({
                        type: 'hidden',
                        name: 'zanafleet_quote_id',
                        value: response.data.quote_id
                    }).appendTo('form.checkout');
                    
                    $('<input>').attr({
                        type: 'hidden',
                        name: 'zanafleet_quote_price',
                        value: response.data.price
                    }).appendTo('form.checkout');
                } else {
                    $error.show().text(response.data || zanafleetData.i18n.error);
                }
            },
            error: function () {
                $loading.hide();
                $error.show().text(zanafleetData.i18n.error);
            }
        });
    }

    /**
     * Display the quote
     */
    function showQuote(quote) {
        const $display = $('#zanafleet-quote-display');
        
        // Format price
        const price = parseFloat(quote.price).toFixed(2);
        const currency = quote.currency || 'KES';
        
        $('.zanafleet-quote-price', $display).html(
            '<strong>' + currency + ' ' + price + '</strong>'
        );
        
        if (quote.estimated_minutes) {
            const hours = Math.floor(quote.estimated_minutes / 60);
            const minutes = quote.estimated_minutes % 60;
            let timeText = '';
            
            if (hours > 0) {
                timeText = hours + ' hour' + (hours > 1 ? 's' : '');
            }
            if (minutes > 0) {
                timeText += (timeText ? ', ' : '') + minutes + ' min';
            }
            
            $('.zanafleet-quote-time', $display).text(
                'Estimated delivery: ' + timeText
            );
        }
        
        $display.slideDown();
    }

    /**
     * Debounce utility
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction() {
            const context = this;
            const args = arguments;
            const later = function () {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})(jQuery);