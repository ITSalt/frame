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