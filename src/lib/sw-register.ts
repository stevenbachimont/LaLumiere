// Enregistrement du Service Worker
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW enregistré avec succès:', registration);
        })
        .catch((registrationError) => {
          console.log('Échec de l\'enregistrement du SW:', registrationError);
        });
    });
  }
}
