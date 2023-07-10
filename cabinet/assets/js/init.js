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

  // Добавляем контейнеры модальных окон
  //$$("#allModals").innerHTML = $.render["tmpl_modalHandMercSelect"]() + $.render["tmpl_modalCalc"]();
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

  await asyncLoadTemplate("/assets/js/allTemplates.html").then(afterTemplatesLoad);

  myUser = new clFrontUser();
  myUser.restoreFromStorage();

  const myURL = window.location.pathname;
  stateManager.changeStateByRoute(myURL);

}

document.addEventListener("DOMContentLoaded", onStartInit);