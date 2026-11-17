<?php
/**
 * Plugin Name: Plotteriet Effekter
 * Description: 3D-effekter og enklere kjøp for plotteriet.no: 3D på innrammede bilder og forsidens hovedbilde, blekkstrek under overskrifter, myk avsløring en fast kjøpsknapp på mobil og kortkoden [plotteriet_forhandsvis] der kunden ser bildet sitt tegnes som plotterskisse. Rører ikke pris, handlekurv eller kasse.
 * Version: 0.3.1
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Plotteriet
 * Text Domain: plotteriet-effekter
 */

if (!defined('ABSPATH')) { exit; }

const PLOTTERIET_EFFEKTER_VERSJON = '0.3.1';

/**
 * Hvilke moduler som er på. Slå av en modul uten å røre koden:
 *   add_filter('plotteriet_effekter_moduler', fn($m) => array_merge($m, array('tilt' => false)));
 */
function plotteriet_effekter_moduler() {
    $er_produkt = function_exists('is_product') && is_product();
    return apply_filters('plotteriet_effekter_moduler', array(
        'tilt'       => true,   // 3D-tilt og lysrefleks med mus
        'rulletilt'  => true,   // bildene dreier og flyter mens du scroller (også på mobil)
        'scene'      => true,   // forsidens hovedbilde i 3D som følger musen
        'understrek' => true,   // blekkstrek som tegnes under overskriftene
        'avsloring'  => true,
        'kjopsbar'   => $er_produkt,
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

/* ── Forhåndsvisning: kundens eget bilde som plotterskisse ───────────────
 * Kortkode: [plotteriet_forhandsvis]. Alt skjer i kundens nettleser; bildet lastes aldri opp.
 */
function plotteriet_effekter_forhandsvis_html() {
    $dir = get_stylesheet_directory();
    $eksempel = file_exists($dir . '/assets/img/foto-portrett.jpg') ? get_stylesheet_directory_uri() . '/assets/img/foto-portrett.jpg' : '';
    $eksempel = apply_filters('plotteriet_forhandsvis_eksempelbilde', $eksempel);

    $chip = static function ($navn, $verdi, $tekst, $valgt = false) {
        return sprintf(
            '<label class="pf__chip"><input type="radio" name="%1$s" value="%2$s"%4$s><span>%3$s</span></label>',
            esc_attr($navn), esc_attr($verdi), esc_html($tekst), $valgt ? ' checked' : ''
        );
    };

    ob_start();
    ?>
<div class="pf" data-pf data-eksempel="<?php echo esc_url($eksempel); ?>">
  <div class="pf__panel">
    <h2 class="big pf__tittel">Se bildet ditt bli strek</h2>
    <p class="pf__lead">Velg et bilde, så tegner plotteren en rask skisse rett her. Bildet blir på din enhet og lastes ikke opp.</p>
    <div class="pf__start">
      <button type="button" class="btn pf__velg">Velg bilde</button>
      <?php if ($eksempel !== '') : ?><button type="button" class="btn btn--ghost pf__eksempel">Prøv med et eksempel</button><?php endif; ?>
      <input type="file" class="pf__fil" accept="image/*" hidden>
    </div>
    <div class="pf__valg" role="group" aria-label="Velg tetthet og format">
      <fieldset><legend>Tetthet</legend><?php echo $chip('pf-tetthet', 'fin', 'Fin') . $chip('pf-tetthet', 'middels', 'Middels', true) . $chip('pf-tetthet', 'grov', 'Grov'); ?></fieldset>
      <fieldset><legend>Format</legend><?php echo $chip('pf-format', 'a5', 'A5', true) . $chip('pf-format', 'a4', 'A4'); ?></fieldset>
    </div>
    <p class="pf__tall" role="status" aria-live="polite"></p>
    <div class="pf__knapper">
      <button type="button" class="btn btn--ghost pf__igjen" disabled>Tegn igjen</button>
      <button type="button" class="btn btn--ghost pf__last" disabled>Lagre bildet</button>
      <a class="btn" href="#skjema">Send bildet til meg</a>
    </div>
    <p class="pf__merk">Dette er en rask maskinell skisse som viser hvordan strek kan se ut. Utkastet jeg lager selv blir finere, og du godkjenner det før noe tegnes.</p>
  </div>
  <figure class="pf__papir">
    <div class="pf__ramme">
      <canvas class="pf__lerret" width="595" height="842" role="img" aria-label="Strektegning av bildet ditt, tegnet opp med penn"></canvas>
      <svg class="pf__penn" viewBox="0 0 40 120" aria-hidden="true" focusable="false"><path d="M20 118 L12 92 L12 18 Q12 6 20 6 Q28 6 28 18 L28 92 Z" fill="#161616"/><path d="M20 118 L15 102 L25 102 Z" fill="#ff8fa3"/><rect x="12" y="40" width="16" height="6" fill="#ff8fa3"/></svg>
      <p class="pf__tom">Velg et bilde for å se skissen</p>
    </div>
  </figure>
</div>
    <?php
    return (string) ob_get_clean();
}
add_shortcode('plotteriet_forhandsvis', 'plotteriet_effekter_forhandsvis_html');

add_action('wp_enqueue_scripts', static function () {
    global $post;
    if (is_admin() || !is_singular() || !($post instanceof WP_Post) || !has_shortcode($post->post_content, 'plotteriet_forhandsvis')) { return; }
    $url = plugin_dir_url(__FILE__);
    wp_enqueue_style('plotteriet-forhandsvis', $url . 'assets/forhandsvis.css', array(), PLOTTERIET_EFFEKTER_VERSJON);
    wp_enqueue_script('plotteriet-forhandsvis', $url . 'assets/forhandsvis.js', array(), PLOTTERIET_EFFEKTER_VERSJON, array('in_footer' => true, 'strategy' => 'defer'));
}, 110);
