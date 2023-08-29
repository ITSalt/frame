$$ = (in_selector) => {
  return document.querySelector(in_selector);
};
$$$ = (in_selector) => {
  return document.querySelectorAll(in_selector);
};

String.prototype.replaceAll = function (str1, str2, ignore) {
  return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"), (ignore ? "gi" : "g")), (typeof (str2) == "string") ? str2.replace(/\$/g, "$$$$") : str2);
}

function asyncLoadTemplate(url) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: url,
      type: "GET",
      //dataType: "json",
      beforeSend: function () {
      },
      success: function (data) {
        resolve(data) // Resolve promise and when success
      },
      error: function (err) {
        reject(err) // Reject the promise and go to catch()
      }
    });
  });
}

function asyncAPI(url, payload) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: `/api/${url}`,
      type: "POST",
      data: JSON.stringify(payload),
      dataType: "json",
      headers: {
        "Content-Type": "application/json"
      },
      statusCode: {
        400: (e) => {
          console.log("400");
          console.log(e.responseJSON);
          reject(e.responseJSON)
        },
        401: () => {
          window.SingSettings.set("user", null);
          window.SingSettings.save();
          changeStateByState(allStates["login"]);
          reject(401);
        }
      },
      success: function (data) {
        /*if (data.freshToken && myUser.token) {
          myUser.token = decodeURI(data.freshToken);
          localStorage.setItem("token", myUser.token);
        }*/

        resolve(data) // Resolve promise and when success
      }
    });
  });
}

const afterTemplatesLoad = (allTmpl) => {
  const tmplDiv = document.createElement("div");
  tmplDiv.innerHTML = allTmpl;

  $(tmplDiv).find('script').each(function () {
    $.templates(this.id, this);
  });

  $.views.converters(allConverters);
  $.views.helpers(allHelpers);

}

const onStartInit = async () => {

  /*if ('serviceWorker' in navigator) {
    asyncAPI("BackRefs/getVersion", {}).then((ver) => {
      const userVersion = window.SingSettings.get("version");
      if (ver.codeVersion != userVersion) {
        window.SingSettings.set("version", ver.codeVersion);
        window.SingSettings.save();
        caches.keys().then((keyList) => Promise.all(keyList.map((key) => caches.delete(key))))
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg) {
            reg.unregister().then(function () { window.location.reload(true); });
          } else {
            window.location.reload(true);
          }
        });
      }
    });
  }*/

  await asyncLoadTemplate("/cabinet/assets/js/allTemplates.html").then(afterTemplatesLoad);

  myUser = new clFrontUser();
  myUser.restoreFromStorage();

  const myURL = window.location.pathname;
  stateManager.changeStateByRoute(myURL);

}


function imageLoader(idPreview, idFile, callBack, maxSize = 800) {
  const preview = $$(idPreview);
  const file = $$(idFile).files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
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
      callBack(JSON.stringify(canvas.toDataURL()));
    };
  };
}

function showNotify(message, pos = "top-right", type = "success", title = "Успешно") {
  $('.page-content-wrapper').pgNotification({
    style: 'circle',
    title: title,
    message: message,
    timeout: 3000,
    type: type,
    position : pos,
    thumbnail: '<img width="40" height="40" style="display: inline-block;" src="/cabinet/assets/img/profiles/avatar2x.jpg" data-src="/cabinet/assets/img/profiles/avatar.jpg" data-src-retina="/cabinet/assets/img/profiles/avatar2x.jpg" alt="">'
  }).show();
}

document.addEventListener("DOMContentLoaded", onStartInit);