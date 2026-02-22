<?php
/**
 * ZanaFleet Autoloader
 * 
 * Inline autoloader to avoid requiring composer in WordPress.
 */

spl_autoload_register(function ($class) {
    $prefix = 'ZanaFleet\\Core\\';
    $base_dir = __DIR__ . '/lib/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});