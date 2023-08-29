_L = stateManager.addState("login", "/cabinet/login", false);

_L.events.btnSignIn = async (event) => {
  event.preventDefault();

  if (_L.validator.form()) {
    const email = $$("#login").value;
    const passwd = md5($$("#password").value);

    const res = await asyncAPI("clUser/authorize", { email, passwd });
    if (res.user) {
      localStorage.setItem("user", JSON.stringify(res.user));
      myUser.restoreFromStorage();
      switch(myUser.fullData.role) {
        case "ROOT":
          stateManager.changeStateByState("main");
          break;
        case "SELLER":
          stateManager.changeStateByState("sellerCat");
          break;
        case "BUYER":
          //stateManager.changeStateByState(_BUYER);
          break;
        default:
          stateManager.changeStateByState("login");
          break;  
      }
    }
    else if (res.errorCode) {
      _L.validator.showErrors({
        "username": "Неверный логин или пароль"
      });
    }
  }
  
}

_L.afterRender = async (data_in) => {
  _L.validator = $('#form-login').validate(
    {
      messages: {
        username: { required: "Пустоте сюда нельзя" },
        password: { required: "Без пароля никак" }
      }
    }
  );
  return data_in;
}