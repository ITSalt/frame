_CTL = stateManager.addState("catalogList", "/cabinet/catalogList", true);

_CTL.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  /*_CTL.catalogList = new clFrontCatalogList();
  await _CTL.catalogList.load();
  data_in.renderData.catalogList = _CTL.catalogList.fullData;*/

  return data_in;
}
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
      stateManager.changeStateByState(_MAIN);
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
_MAIN = stateManager.addState("main", "/cabinet", true);

_MAIN.afterRender = async (data_in) => {
  

  return data_in;
}
_UE = stateManager.addState("userEdit", "/cabinet/userEdit/:idUser", true);

_UE.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  _UE.currentUser = new clFrontUser(data_in.renderData.exp.idUser);
  await _UE.currentUser.load();
  data_in.renderData.user = _UE.currentUser.fullData;

  return data_in;
}

_UE.events.avatarLoader = async (e) => {
  const preview = $$("#avatarPreview");
  const file = $$("#avatarLoader").files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      preview.src = canvas.toDataURL();
      _UE.currentUser.fullData.avatarData = JSON.stringify(canvas.toDataURL());

    };
  };
}

_UE.events.btnSaveUser = async (e) => {
  if (_UE.validator.form()) {
    _UE.currentUser.fullData.fName = $$("[name=fName]").value;
    _UE.currentUser.fullData.lName = $$("[name=lName]").value;
    _UE.currentUser.fullData.mName = $$("[name=mName]").value;
    _UE.currentUser.fullData.email = $$("[name=email]").value;
    _UE.currentUser.fullData.phone = $$("[name=phone]").value;
    _UE.currentUser.fullData.passwd = md5($$("[name=passwd]").value);

    const res = await _UE.currentUser.save();
    console.log(res);
  }
}

_UE.afterRender = async (data_in) => {
  $$("#avatarLoader").addEventListener('change', _UE.events.avatarLoader, false);
  _UE.validator = $('#fmUserEdit').validate(
    {
      messages: {
        fName: { required: "Без имени никак" },
        lName: { required: "Без фамилии никак" },
        email: { required: "Без почты никак" },
        passwd: { required: "Без пароля никак" },
        passwdRepeat: { equalTo: "Пароли не совпадают" }
      },
      rules: {
        passwdRepeat: {
          equalTo: "#passwd"
        }
      }
    }
  );

  return data_in;
}
//popupTemplates.push("editUserPopup");

_USL = stateManager.addState("userList", "/cabinet/userList", true);

_USL.beforeRender = async (data_in) => {
  
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  data_in.renderData.userList = await clFrontUserList.getUserList();

  return data_in;
}

/*_USL.events.btnUserEdit = async (e) => {
  const id = $$("#btnUserEdit").dataset["id"];
  _USL.currentUser = await clFrontUserList.getUser(id);
  $('#editUserPopup').replaceWith($.render["tmpl_editUserPopup"](_USL.currentUser.fullData));
  $$("#avatarLoader").addEventListener('change', _USL.events.avatarLoader, false);
  $('#editUserPopup').modal('show');
}*/

_USL.afterRender = async (data_in) => {
  $("#tblUserList").DataTable({
    "sDom": "<t><'row'<p i>>",
    "destroy": true,
    "scrollCollapse": true,
    data: data_in.userList,
    columns: [
      { data: "fullData.fName" },
      { data: "fullData.lName" },
      { data: "fullData.mName" },
      { data: "fullData.email" },
      { data: "fullData.phone" },
      {
        data: "fullData.created", render: function (data, type, row) {
          return moment(data).format('DD.MM.YY HH:mm:ss');
        }
      },
      {
        data: "", render: function (data, type, row) {
          return $.render["tmpl_userListActions"]({ id: row.fullData.id });
        }
      }
    ]
  });

  

  return data_in;
}

_USL.events.btnUserSave = async (e) => {
  
  if (_USL.validator.form()) {
    const res = await _USL.currentUser.save();
    if (res) {
      $('#editUserPopup').modal('hide');
      stateManager.changeStateByState(_USL);
    }
  }
}