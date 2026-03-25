export async function showBrowserNotification(title, body) {
  if (!("Notification" in window)) return;
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission === "granted") {
    new Notification(title, {
      body,
      icon: "https://aistudio.google.com/favicon.ico",
    });
  }
}
