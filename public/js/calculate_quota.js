function handleCredentialResponse(response) {
  const tokenPayload = parseJwt(response.credential);

  // Guardar el email en una variable global
  window.loggedInUserEmail = (tokenPayload.email || "usuario_desconocido");

  // Actualizar la UI con el email
  document.getElementById("userEmailDisplay").innerText = window.loggedInUserEmail;
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // (NUEVO) Llamar la función que creamos en calculate_quota.js
  if (window.refreshPatreonInfo) {
    window.refreshPatreonInfo();
  }
}
