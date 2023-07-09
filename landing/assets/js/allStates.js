_L = stateManager.addState("login", "/cabinet/login", false);

_L.events.btnSignIn = async (event) => {
  event.preventDefault();
  const login = $("#login").val();
  const password = $("#password").val();

  const res = await api.login(login, password);
  if (res.status == 200) {
    stateManager.changeStateByState(_MAIN);
  } else {
    alert("Неверный логин или пароль!");
  }
}
_MAIN = stateManager.addState("main", "/cabinet", false);