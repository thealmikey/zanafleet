/**
 * ZanaFleet WooCommerce Admin Onboarding JavaScript
 */

jQuery(document).ready(function($) {
    // Handle the Register Store button click
    $('#zanafleet_settings\\[onboard_button\\]').on('click', function(e) {
        e.preventDefault();
        
        var $button = $(this);
        var $form = $button.closest('form');
        
        // Get form values
        var storeName = $('#zanafleet_settings\\[store_name\\]').val();
        var businessType = $('#zanafleet_settings\\[business_type\\]').val();
        var adminFirstName = $('#zanafleet_settings\\[admin_first_name\\]').val();
        var adminLastName = $('#zanafleet_settings\\[admin_last_name\\]').val();
        var phoneNumber = $('#zanafleet_settings\\[phone_number\\]').val();
        var addressStreet = $('#zanafleet_settings\\[address_street\\]').val();
        var addressCity = $('#zanafleet_settings\\[address_city\\]').val();
        var addressCounty = $('#zanafleet_settings\\[address_county\\]').val();
        
        // Validate required fields
        if (!storeName || !businessType || !adminFirstName || !adminLastName || !phoneNumber) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Get the API base URL from settings or use default
        var baseUrl = zanafleetAdmin.baseUrl || 'http://localhost:3000/api/v1';
        
        // Show loading state
        $button.prop('disabled', true).text('Registering...');
        
        // Call the registration API
        $.ajax({
            url: baseUrl + '/woocommerce/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                storeName: storeName,
                storeUrl: window.location.origin,
                adminEmail: zanafleetAdmin.adminEmail || '',
                adminFirstName: adminFirstName,
                adminLastName: adminLastName,
                phoneNumber: phoneNumber,
                businessType: businessType,
                address: {
                    street: addressStreet || '',
                    city: addressCity || '',
                    county: addressCounty || '',
                    country: 'KE', // Default to Kenya
                    postalCode: ''
                }
            }),
            success: function(response) {
                // Store the API credentials
                $('#zanafleet_settings\\[api_key\\]').val(response.apiKey);
                $('#zanafleet_settings\\[api_secret\\]').val(response.apiSecret);
                
                // Show success message
                alert('Store registered successfully! Your API credentials have been saved.');
                
                // Update button text
                $button.text('Registered ✓').prop('disabled', true);
                
                // Trigger form save
                $form.find('.woocommerce-save-button').trigger('click');
            },
            error: function(xhr, status, error) {
                var errorMsg = 'Failed to register store. Please try again.';
                try {
                    var response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                
                alert(errorMsg);
                $button.prop('disabled', false).text('Register Store');
            }
        });
    });
    
    // Check if already registered - hide button if API key exists
    if ($('#zanafleet_settings\\[api_key\\]').val()) {
        $('#zanafleet_settings\\[onboard_button\\]')
            .text('Update Connection')
            .removeClass('button-primary')
            .addClass('button-secondary');
    }
});
