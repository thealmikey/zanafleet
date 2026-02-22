<?php
/**
 * ZanaFleet WooCommerce Test Bootstrap
 * 
 * This bootstrap file sets up the WordPress/WooCommerce test environment
 * for running PHPUnit tests against the ZanaFleet plugin.
 * 
 * @package ZanaFleet\Tests
 * @subpackage Bootstrap
 */

declare(strict_types=1);

// Define constants early
if (!defined('ZANAFLEET_VERSION')) {
    define('ZANAFLEET_VERSION', '1.0.0');
}

if (!defined('ZANAFLEET_TEST_MODE')) {
    define('ZANAFLEET_TEST_MODE', true);
}

// Find WordPress test library
$_tests_dir = getenv('WP_TESTS_DIR')
    ? getenv('WP_TESTS_DIR')
    : '/tmp/wordpress/tests';

// Try to locate WordPress test library
if (!file_exists($_tests_dir . '/includes/functions.php')) {
    // Look in common locations
    $possible_paths = [
        '/tmp/wordpress/tests',
        '/var/www/html/tests',
        dirname(__FILE__, 4) . '/wordpress/tests',
        dirname(__FILE__, 3) . '/wordpress/tests',
        dirname(__FILE__, 2) . '/wordpress/tests',
    ];
    
    foreach ($possible_paths as $path) {
        if (file_exists($path . '/includes/functions.php')) {
            $_tests_dir = $path;
            break;
        }
    }
}

// Load WordPress test library if available
if (file_exists($_tests_dir . '/includes/functions.php')) {
    define('WP_TESTS_DIR', $_tests_dir);
    require_once WP_TESTS_DIR . '/includes/functions.php';
} else {
    // Create minimal mock WordPress environment for unit tests
    _create_minimal_wp_mock();
}

/**
 * Create minimal WordPress mock for unit testing without full WordPress
 */
function _create_minimal_wp_mock(): void
{
    // Define minimal WordPress constants
    if (!defined('ABSPATH')) {
        define('ABSPATH', dirname(__FILE__, 3) . '/');
    }
    
    if (!defined('WP_CONTENT_DIR')) {
        define('WP_CONTENT_DIR', ABSPATH . 'wp-content');
    }
    
    if (!defined('WP_PLUGIN_DIR')) {
        define('WP_PLUGIN_DIR', WP_CONTENT_DIR . '/plugins');
    }
    
    if (!defined('WC_PLUGIN_FILE')) {
        define('WC_PLUGIN_FILE', WP_PLUGIN_DIR . '/woocommerce/woocommerce.php');
    }
    
    // Mock WordPress functions
    if (!function_exists('get_option')) {
        function get_option($option, $default = false)
        {
            return $default;
        }
    }
    
    if (!function_exists('update_option')) {
        function update_option($option, $value): bool
        {
            return true;
        }
    }
    
    if (!function_exists('wp_remote_request')) {
        function wp_remote_request($url, $args = [])
        {
            return [
                'response' => ['code' => 200],
                'body' => json_encode(['success' => true]),
            ];
        }
    }
    
    if (!function_exists('wp_remote_retrieve_response_code')) {
        function wp_remote_retrieve_response_code($response): int
        {
            return $response['response']['code'] ?? 200;
        }
    }
    
    if (!function_exists('wp_remote_retrieve_body')) {
        function wp_remote_retrieve_body($response): string
        {
            return $response['body'] ?? '';
        }
    }
    
    if (!function_exists('wp_json_encode')) {
        function wp_json_encode($data, $options = 0): string
        {
            return json_encode($data, $options);
        }
    }
    
    if (!function_exists('wp_hash')) {
        function wp_hash($data, $scheme = 'auth'): string
        {
            return hash_hmac('md5', $data, 'test-secret-key');
        }
    }
    
    if (!function_exists('wp_generate_password')) {
        function wp_generate_password($length = 12, $special_chars = true, $extra_special_chars = false): string
        {
            $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            if ($special_chars) {
                $chars .= '!@#$%^&*()';
            }
            $password = '';
            for ($i = 0; $i < $length; $i++) {
                $password .= substr($chars, wp_rand(0, strlen($chars) - 1), 1);
            }
            return $password;
        }
    }
    
    if (!function_exists('wp_rand')) {
        function wp_rand($min = 0, $max = 0): int
        {
            return random_int($min, $max);
        }
    }
    
    if (!function_exists('is_wp_error')) {
        function is_wp_error($thing): bool
        {
            return $thing instanceof WP_Error;
        }
    }
    
    if (!function_exists('__')) {
        function __($text, $domain = 'default'): string
        {
            return $text;
        }
    }
    
    if (!function_exists('_e')) {
        function _e($text, $domain = 'default'): void
        {
            echo $text;
        }
    }
    
    if (!function_exists('esc_html__')) {
        function esc_html__($text, $domain = 'default'): string
        {
            return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        }
    }
    
    if (!function_exists('esc_attr__')) {
        function esc_attr__($text, $domain = 'default'): string
        {
            return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        }
    }
    
    if (!function_exists('esc_html_e')) {
        function esc_html_e($text, $domain = 'default'): void
        {
            echo htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        }
    }
    
    if (!function_exists('admin_url')) {
        function admin_url($path = '', $scheme = 'admin'): string
        {
            return 'http://example.org/wp-admin/' . ltrim($path, '/');
        }
    }
    
    if (!function_exists('plugin_basename')) {
        function plugin_basename($file): string
        {
            return basename(dirname($file)) . '/' . basename($file);
        }
    }
    
    if (!function_exists('plugin_dir_url')) {
        function plugin_dir_url($file): string
        {
            return 'http://example.org/wp-content/plugins/' . basename(dirname($file)) . '/';
        }
    }
    
    if (!function_exists('plugin_dir_path')) {
        function plugin_dir_path($file): string
        {
            return trailingslashit(dirname($file));
        }
    }
    
    if (!function_exists('trailingslashit')) {
        function trailingslashit($string): string
        {
            return rtrim($string, '/\\') . '/';
        }
    }
    
    if (!function_exists('untrailingslashit')) {
        function untrailingslashit($string): string
        {
            return rtrim($string, '/\\');
        }
    }
    
    if (!function_exists('sanitize_text_field')) {
        function sanitize_text_field($str): string
        {
            return trim(strip_tags($str));
        }
    }
    
    if (!function_exists('sanitize_email')) {
        function sanitize_email($email): string
        {
            return filter_var($email, FILTER_SANITIZE_EMAIL);
        }
    }
    
    if (!function_exists('absint')) {
        function absint($maybeint)
        {
            return abs((int) $maybeint);
        }
    }
    
    if (!function_exists('esc_url')) {
        function esc_url($url, $protocols = null, $_context = 'display'): string
        {
            return filter_var($url, FILTER_SANITIZE_URL);
        }
    }
    
    if (!function_exists('get_bloginfo')) {
        function get_bloginfo($show = '', $filter = 'raw'): string
        {
            return 'Test Blog';
        }
    }
    
    if (!function_exists('wp_kses_post')) {
        function wp_kses_post($string): string
        {
            return strip_tags($string);
        }
    }
    
    if (!function_exists('get_post_meta')) {
        function get_post_meta($post_id, $key = '', $single = false)
        {
            return $single ? '' : [];
        }
    }
    
    if (!function_exists('update_post_meta')) {
        function update_post_meta($post_id, $meta_key, $meta_value, $prev_value = ''): bool
        {
            return true;
        }
    }
    
    if (!function_exists('delete_post_meta')) {
        function delete_post_meta($post_id, $meta_key, $meta_value = ''): bool
        {
            return true;
        }
    }
    
    if (!function_exists('add_post_meta')) {
        function add_post_meta($post_id, $meta_key, $meta_value, $unique = false): int
        {
            return 1;
        }
    }
    
    // Mock WC classes
    if (!class_exists('WC_Shipping_Method')) {
        /**
         * Mock WC_Shipping_Method for testing
         */
        class WC_Shipping_Method
        {
            public $id;
            public $instance_id;
            public $method_title;
            public $method_description;
            public $supports = [];
            public $instance_form_fields = [];
            public $instance_settings = [];
            public $title;
            public $tax_status = 'taxable';
            public $cost = 0;
            
            public function __construct($instance_id = 0)
            {
                $this->instance_id = absint($instance_id);
            }
            
            public function init(): void
            {
                $this->init_form_fields();
                $this->init_settings();
            }
            
            public function init_form_fields(): void
            {
                // Override in child class
            }
            
            public function init_settings(): void
            {
                // Override in child class
            }
            
            public function get_instance_option($key, $default = '')
            {
                return isset($this->instance_settings[$key]) 
                    ? $this->instance_settings[$key] 
                    : $default;
            }
            
            public function get_option($key, $default = '')
            {
                return isset($this->settings[$key]) 
                    ? $this->settings[$key] 
                    : $default;
            }
            
            public function calculate_shipping($package = [])
            {
                return [];
            }
            
            public function add_rate($args = [])
            {
                return new WC_Shipping_Rate($args);
            }
        }
    }
    
    if (!class_exists('WC_Shipping_Rate')) {
        /**
         * Mock WC_Shipping_Rate for testing
         */
        class WC_Shipping_Rate
        {
            public $id;
            public $method_id;
            public $instance_id;
            public $label;
            public $cost;
            public $taxes = [];
            
            public function __construct($args = [])
            {
                $this->id = $args['id'] ?? '';
                $this->method_id = $args['method_id'] ?? '';
                $this->instance_id = $args['instance_id'] ?? 0;
                $this->label = $args['label'] ?? '';
                $this->cost = $args['cost'] ?? 0;
                $this->taxes = $args['taxes'] ?? [];
            }
            
            public function get_id(): string
            {
                return $this->id;
            }
            
            public function get_method_id(): string
            {
                return $this->method_id;
            }
            
            public function get_instance_id(): int
            {
                return $this->instance_id;
            }
            
            public function get_label(): string
            {
                return $this->label;
            }
            
            public function get_cost(): float
            {
                return (float) $this->cost;
            }
            
            public function get_taxes(): array
            {
                return $this->taxes;
            }
        }
    }
    
    if (!class_exists('WC_Order')) {
        /**
         * Mock WC_Order for testing
         */
        class WC_Order
        {
            public $id = 0;
            public $status = 'pending';
            protected $data = [];
            
            public function __construct($id = 0)
            {
                $this->id = $id;
            }
            
            public function get_id(): int
            {
                return $this->id;
            }
            
            public function get_status(): string
            {
                return $this->status;
            }
            
            public function get_meta($key, $single = true, $context = 'view')
            {
                return $single ? '' : [];
            }
            
            public function update_meta_data($key, $value): void
            {
                $this->data[$key] = $value;
            }
            
            public function save(): int
            {
                return $this->id;
            }
            
            public function get_billing_first_name(): string
            {
                return 'John';
            }
            
            public function get_billing_last_name(): string
            {
                return 'Doe';
            }
            
            public function get_billing_email(): string
            {
                return 'john@example.org';
            }
            
            public function get_billing_phone(): string
            {
                return '+1234567890';
            }
            
            public function get_shipping_first_name(): string
            {
                return 'John';
            }
            
            public function get_shipping_last_name(): string
            {
                return 'Doe';
            }
            
            public function get_shipping_address_1(): string
            {
                return '123 Test St';
            }
            
            public function get_shipping_address_2(): string
            {
                return '';
            }
            
            public function get_shipping_city(): string
            {
                return 'Nairobi';
            }
            
            public function get_shipping_state(): string
            {
                return 'Nairobi';
            }
            
            public function get_shipping_postcode(): string
            {
                return '00100';
            }
            
            public function get_shipping_country(): string
            {
                return 'KE';
            }
            
            public function get_formatted_shipping_address(): string
            {
                return '123 Test St, Nairobi, Kenya';
            }
            
            public function get_total(): string
            {
                return '100.00';
            }
            
            public function get_subtotal(): string
            {
                return '80.00';
            }
            
            public function get_shipping_total(): string
            {
                return '20.00';
            }
            
            public function get_items($type = 'line_item')
            {
                return [];
            }
            
            public function get_item_count($type = 'line_item'): int
            {
                return 0;
            }
            
            public function get_total_shipping(): string
            {
                return '20.00';
            }
            
            public function get_total_tax(): string
            {
                return '0.00';
            }
            
            public function get_meta_data(): array
            {
                return [];
            }
        }
    }
    
    if (!class_exists('WC_Product')) {
        /**
         * Mock WC_Product for testing
         */
        class WC_Product
        {
            public $id = 0;
            public $weight = 0;
            public $length = 0;
            public $width = 0;
            public $height = 0;
            
            public function __construct($id = 0)
            {
                $this->id = $id;
            }
            
            public function get_id(): int
            {
                return $this->id;
            }
            
            public function get_weight($context = 'view'): string
            {
                return (string) $this->weight;
            }
            
            public function get_length($context = 'view'): string
            {
                return (string) $this->length;
            }
            
            public function get_width($context = 'view'): string
            {
                return (string) $this->width;
            }
            
            public function get_height($context = 'view'): string
            {
                return (string) $this->height;
            }
            
            public function get_dimensions($include_dimensions = true): string
            {
                return '';
            }
            
            public function is_virtual(): bool
            {
                return false;
            }
            
            public function get_price(): string
            {
                return '0.00';
            }
            
            public function get_regular_price(): string
            {
                return '0.00';
            }
            
            public function get_sale_price(): string
            {
                return '0.00';
            }
        }
    }
    
    if (!class_exists('WP_Error')) {
        /**
         * Mock WP_Error for testing
         */
        class WP_Error
        {
            public $errors = [];
            public $error_data = [];
            
            public function __construct($code = '', $message = '', $data = '')
            {
                if (empty($code)) {
                    return;
                }
                $this->errors[$code][] = $message;
                if (!empty($data)) {
                    $this->error_data[$code] = $data;
                }
            }
            
            public function get_error_code(): string
            {
                $codes = $this->get_error_codes();
                return empty($codes) ? '' : $codes[0];
            }
            
            public function get_error_codes(): array
            {
                return array_keys($this->errors);
            }
            
            public function get_error_message($code = ''): string
            {
                if (empty($code)) {
                    $code = $this->get_error_code();
                }
                $messages = $this->get_error_messages($code);
                return empty($messages) ? '' : $messages[0];
            }
            
            public function get_error_messages($code = ''): array
            {
                if (empty($code)) {
                    $all_messages = [];
                    foreach ((array) $this->errors as $code => $messages) {
                        $all_messages = array_merge($all_messages, $messages);
                    }
                    return $all_messages;
                }
                return $this->errors[$code] ?? [];
            }
            
            public function get_error_data($code = ''): mixed
            {
                if (empty($code)) {
                    $code = $this->get_error_code();
                }
                return $this->error_data[$code] ?? null;
            }
            
            public function add($code, $message, $data = ''): void
            {
                $this->errors[$code][] = $message;
                if (!empty($data)) {
                    $this->error_data[$code] = $data;
                }
            }
        }
    }
    
    if (!class_exists('WC_Cart')) {
        /**
         * Mock WC_Cart for testing
         */
        class WC_Cart
        {
            public $cart_contents = [];
            
            public function get_cart_contents(): array
            {
                return $this->cart_contents;
            }
            
            public function get_subtotal(): string
            {
                return '100.00';
            }
            
            public function get_total(): string
            {
                return '100.00';
            }
            
            public function get_shipping_total(): string
            {
                return '0.00';
            }
            
            public function get_tax_total(): string
            {
                return '0.00';
            }
            
            public function is_empty(): bool
            {
                return empty($this->cart_contents);
            }
            
            public function get_cart_contents_count(): int
            {
                return count($this->cart_contents);
            }
            
            public function needs_shipping(): bool
            {
                return true;
            }
            
            public function show_shipping(): bool
            {
                return true;
            }
            
            public function get_customer(): WC_Customer
            {
                return new WC_Customer();
            }
        }
    }
    
    if (!class_exists('WC_Customer')) {
        /**
         * Mock WC_Customer for testing
         */
        class WC_Customer
        {
            public $shipping = [];
            
            public function get_shipping_country(): string
            {
                return 'KE';
            }
            
            public function get_shipping_state(): string
            {
                return 'Nairobi';
            }
            
            public function get_shipping_city(): string
            {
                return 'Nairobi';
            }
            
            public function get_shipping_postcode(): string
            {
                return '00100';
            }
            
            public function get_shipping_address_1(): string
            {
                return '123 Test St';
            }
            
            public function get_shipping_address_2(): string
            {
                return '';
            }
            
            public function get_formatted_shipping_address(): string
            {
                return '123 Test St, Nairobi, Kenya';
            }
            
            public function get_billing_country(): string
            {
                return 'KE';
            }
            
            public function get_billing_state(): string
            {
                return 'Nairobi';
            }
            
            public function get_billing_city(): string
            {
                return 'Nairobi';
            }
            
            public function get_billing_postcode(): string
            {
                return '00100';
            }
            
            public function get_billing_address_1(): string
            {
                return '123 Test St';
            }
            
            public function get_billing_address_2(): string
            {
                return '';
            }
            
            public function get_billing_phone(): string
            {
                return '+1234567890';
            }
            
            public function get_billing_email(): string
            {
                return 'john@example.org';
            }
        }
    }
    
    // Mock WP_REST_Response
    if (!class_exists('WP_REST_Response')) {
        class WP_REST_Response
        {
            protected $data = [];
            protected $headers = [];
            
            public function __construct($data, $status = 200)
            {
                $this->data = $data;
            }
            
            public function get_data(): array
            {
                return $this->data;
            }
            
            public function get_status(): int
            {
                return 200;
            }
            
            public function set_headers(array $headers): void
            {
                $this->headers = $headers;
            }
            
            public function get_headers(): array
            {
                return $this->headers;
            }
        }
    }
    
    // Mock WP_REST_Request
    if (!class_exists('WP_REST_Request')) {
        class WP_REST_Request
        {
            protected $method = 'GET';
            protected $params = ['GET' => [], 'POST' => [], 'URL' => [], 'HEADERS' => []];
            protected $body = '';
            
            public function __construct($method = 'GET')
            {
                $this->method = $method;
            }
            
            public function get_method(): string
            {
                return $this->method;
            }
            
            public function get_param($key): mixed
            {
                return $this->params[$this->method][$key] ?? null;
            }
            
            public function get_params(): array
            {
                return $this->params[$this->method] ?? [];
            }
            
            public function get_body(): string
            {
                return $this->body;
            }
            
            public function get_json_params(): ?array
            {
                return json_decode($this->body, true);
            }
            
            public function set_body($body): void
            {
                $this->body = $body;
            }
            
            public function set_param($key, $value): void
            {
                $this->params[$this->method][$key] = $value;
            }
            
            public function get_header($key): string
            {
                return $this->params['HEADERS'][$key] ?? '';
            }
            
            public function get_headers(): array
            {
                return $this->params['HEADERS'] ?? [];
            }
        }
    }
    
    // Set test mode flag
    if (!defined('ZANAFLEET_TESTING')) {
        define('ZANAFLEET_TESTING', true);
    }
}

/**
 * Load the plugin for testing
 */
function _load_plugin_for_testing(): void
{
    // Load the autoloader
    require_once dirname(__FILE__, 3) . '/includes/Autoloader.php';
    
    // Load the main plugin file to initialize the plugin
    require_once dirname(__FILE__, 3) . '/zanafleet.php';
}

// Load plugin when WordPress test framework is ready
if (function_exists('tests_add_filter')) {
    tests_add_filter('muplugins_loaded', '_load_plugin_for_testing');
}

// Include WordPress test framework if available
if (file_exists(WP_TESTS_DIR . '/includes/functions.php')) {
    require_once WP_TESTS_DIR . '/includes/functions.php';
}