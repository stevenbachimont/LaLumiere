// Enregistrement du Service Worker
export function registerSW(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration: ServiceWorkerRegistration) => {
          console.log('SW enregistré avec succès:', registration);
        })
        .catch((registrationError: Error) => {
          console.log('Échec de l\'enregistrement du SW:', registrationError);
        });
    });
  }
}
