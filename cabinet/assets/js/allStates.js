_L = stateManager.addState("login", "/cabinet/login", false);

_L.events.btnSignIn = async (event) => {
  event.preventDefault();
  const email = $$("#login").value;
  const passwd = $$("#password").value;

  const res = await asyncAPI("clUser/authorize", { email, passwd });
  if (res.token) {
    localStorage.setItem("token", decodeURI(res.token));
    localStorage.setItem("user", JSON.stringify(res.user));
    myUser.restoreFromStorage();
    stateManager.changeStateByState(_MAIN);
  }
  /*
  if (res.status == 200) {
    stateManager.changeStateByState(_MAIN);
  } else {
    alert("Неверный логин или пароль!");
  }*/
}
_MAIN = stateManager.addState("main", "/cabinet", true);