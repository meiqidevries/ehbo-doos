/* EHBO-doos · instellingen voor de beheerder
 *
 * relay: het adres van de doorgeefserver voor live sessies.
 *        De pilot gebruikt de openbare server van ntfy (https://ntfy.sh), met een limiet
 *        van 250 berichten per dag per netwerkadres. Voor gebruik door meerdere kantoren
 *        hoort hier het adres van een eigen ntfy-server te staan, bijvoorbeeld
 *        'https://sessies.voorbeeld.nl'. Zie OVERDRACHT.md.
 */
window.EHBO_CONFIG = {
  relay: 'https://ntfy.sh'
};
