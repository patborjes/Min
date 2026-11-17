# Plotteriet Effekter

Lite WordPress-plugin med 3D-effekter og enklere kjøp for plotteriet.no. Rører ikke pris, handlekurv eller kasse.

**Moduler (v0.3.1)**
- `tilt`: innrammede bilder dreier i 3D med lysrefleks når musen beveger seg over. Aldri på berøringsskjerm.
- `rulletilt`: innrammede bilder dreier og flyter i dybden mens du scroller. Virker også på mobil.
- `scene`: forsidens hovedbilde ligger i 3D og følger musen (scroll på mobil).
- `understrek`: en blekkstrek tegnes under overskriftene når de kommer til syne.
- `avsloring`: seksjoner tones og vippes mykt inn når de kommer til syne.
- `kjopsbar`: fast kjøpsknapp nederst på produktsider på mobil, med tittel og pris. Trykker den ekte «legg i handlekurv»-knappen, eller tar kunden til feltet som mangler.

**Forhåndsvisning:** kortkoden `[plotteriet_forhandsvis]` viser en plotterskisse av kundens eget bilde (krysskravur i fire retninger, valg av tetthet og A5/A4). Alt skjer i nettleseren; bildet lastes aldri opp. Merket tydelig som maskinell skisse.

Alle respekterer «reduser bevegelse».

**Installere:** wp-admin › Utvidelser › Legg til › Last opp utvidelse › `plotteriet-effekter.zip` › Aktiver.
**Slå av:** deaktiver pluginet. Enkeltmoduler kan slås av med filteret `plotteriet_effekter_moduler`.
