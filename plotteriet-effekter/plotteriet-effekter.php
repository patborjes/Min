<?php
/**
 * Plugin Name: Plotteriet Effekter
 * Description: 3D-effekter og enklere kjøp for plotteriet.no: tilt og lysrefleks på innrammede bilder, myk avsløring av seksjoner og en fast kjøpsknapp på mobil. Rører ikke pris, handlekurv eller kasse.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Plotteriet
 * Text Domain: plotteriet-effekter
 */

if (!defined('ABSPATH')) { exit; }

const PLOTTERIET_EFFEKTER_VERSJON = '0.1.0';

/**
 * Hvilke moduler som er på. Slå av en modul uten å røre koden:
 *   add_filter('plotteriet_effekter_moduler', fn($m) => array_merge($m, array('tilt' => false)));
 */
function plotteriet_effekter_moduler() {
    $er_produkt = function_exists('is_product') && is_product();
    return apply_filters('plotteriet_effekter_moduler', array(
        'tilt'      => true,
        'avsloring' => true,
        'kjopsbar'  => $er_produkt,
    ));
}

add_action('wp_enqueue_scripts', static function () {
    if (is_admin()) { return; }
    $moduler = plotteriet_effekter_moduler();
    if (!array_filter($moduler)) { return; }

    $url = plugin_dir_url(__FILE__);
    $v = PLOTTERIET_EFFEKTER_VERSJON;
    wp_enqueue_style('plotteriet-effekter', $url . 'assets/effekter.css', array(), $v);
    wp_enqueue_script('plotteriet-effekter', $url . 'assets/effekter.js', array(), $v, array('in_footer' => true, 'strategy' => 'defer'));
    wp_add_inline_script('plotteriet-effekter', 'window.PLOTTERIET_EFFEKTER = ' . wp_json_encode($moduler) . ';', 'before');
}, 110);
