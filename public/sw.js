// Service worker : affiche le petit mot quotidien du dragon et ouvre le jeu au toucher.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { titre, corps } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: corps,
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((fenetre) => "focus" in fenetre);
      return ouverte ? ouverte.focus() : self.clients.openWindow("/");
    })
  );
});
