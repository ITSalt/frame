allConverters = {
  "console": (data) => {
    console.log(data);
  },
  "stateRouteByName": (stateName) => {
    return stateName in stateManager.states ? stateManager.getParsedRoute(stateName) : "/err404";
  },
};

allHelpers = {
  "jsonToString": (jsonData) => {
    return encodeURI(JSON.stringify(jsonData));
  }
};
const renderManager = {
  parentTemplate : {
    element: "",
    name: "",
  },
  element: "",
  template: "",
  renderData: {}
};

const popupTemplates= [];

class stateManager {
  static states = {};
  
  static addState(stateName, route, onlyAuth, templateName) {
    stateManager.states[stateName] = new state(stateName, route, onlyAuth, templateName || stateName);
    return stateManager.states[stateName];
  }
  
  static getState(stateName) {
    return stateManager.states[stateName];
  }

  static async changeStateByRoute(route_in = window.location.pathname, data_in = {}) {
    const data = Object.assign({}, data_in, { exp: { ...data_in.exp } });

    let route = route_in;
    if (route != "/" && route.slice(-1) == "/") {
      route = route.slice(0, -1);
    }

    let newState = stateManager.states["err404"];
    for (const [stateName, stateObj] of Object.entries(stateManager.states)) {
      if (stateObj.regRoute.test(route)) {
        newState = stateObj;
        if (newState.route.includes(":")) {
          const routeArr = route.split("/");
          for (const [oneExp, expIndex] of Object.entries(newState.expIndex)) {
            newState.exp[oneExp.substring(1)] = routeArr[expIndex];
            data.exp[oneExp.substring(1)] = routeArr[expIndex];
          }
        }
        break;
      }
    }

    return stateManager.changeStateByState(newState, data);
  }

  static async changeStateByState(newState, data_in) {
    const data = data_in || {};
    data.exp = data.exp || {};

    stateManager.getParsedRoute(newState, data.exp);

    let renderData = await newState._beforeRender(data);
    if (!renderData) {
      return false;
    }
    renderData = await newState.beforeRender(renderData);

    stateManager.getParsedRoute(newState, renderData.renderData.exp);

    if ($.render[renderData.template]) {
      let element = $$(`#${renderData.element}`);
      if(!element) {
        const parentElement = $$(`#${renderData.parentTemplate.element}`);
        if (parentElement) {
          parentElement.innerHTML = $.render[renderData.parentTemplate.name](renderData.renderData);
          element = $$(`#${renderData.element}`);
        } else {
          console.error("TMPL ERR: Cannot find parent element %s for template %s", renderData.parentTemplate.element, renderData.parentTemplate.name);
        }
      }

      if (element) {
        element.innerHTML = $.render[renderData.template](renderData.renderData);
      } else {
        console.error("TMPL ERR: Cannot find element %s for template %s", renderData.element, renderData.template);
      }
    }

    // render all modals from popupTemplates array and add render html to #allModals
    let allModalsHTML = "";
    for (let i = 0; i < popupTemplates.length; i++) {
      allModalsHTML += $.render[`tmpl_${popupTemplates[i]}`]({});
    }
    if ($$("#allModals")) 
      $$("#allModals").innerHTML = allModalsHTML;

    await newState.afterRender(renderData.renderData);
    await newState._afterRender(renderData.renderData);

    const url = `${stateManager.states[newState.name].parsedRoute}${data.exp.urlPostfix ? `/#${data.exp.urlPostfix}` : ""}`;
    window.history.pushState(renderData.renderData, newState.name, url);

    if (data.exp.urlPostfix && document.getElementById(data.exp.urlPostfix)) {
      document.getElementById(data.exp.urlPostfix).scrollIntoView();
    }

    return true;
  }

  static getParsedRoute(newState, expressions) {
    // ensure we have a valid state object
    if (!newState || typeof newState !== 'object') {
      console.error('Invalid state:', newState);
      return null;
    }

    let newRoute = newState.route;
    if (newRoute.includes(":")) {
      const routeArr = newRoute.split("/");
      for (const [oneExp, expIndex] of Object.entries(newState.expIndex)) {
        routeArr[expIndex] = expressions[oneExp.substring(1)];
      }
      newRoute = routeArr.join("/");
    }

    // update parsedRoute directly on the newState object
    newState.parsedRoute = newRoute;

    return newRoute;
  }

}


class state {
  
  constructor(name, route, onlyAuth, templateName) {
    this.name = name;
    this.route = route;
    this.onlyAuth = Boolean(onlyAuth);
    this.templateName = templateName;
    this.parsedRoute = route;
    this.events = {};
    
    this.exp = {}; // Parameter values will be stored here
    this.expIndex = {}; // Indices of parameters in route string will be stored here
    this.regRoute = this.createRegRoute();
    
    
    
    //this.expIndex = {};

    /*
    const routeArr = route.split("/");
    for (let i = 0; i < routeArr.length; i++) {
      const onePart = routeArr[i];
      if (onePart.indexOf("%") > -1) {
        this.expIndex[onePart] = i;
        routeArr[i] = "[a-z0-9-]*";
      }
    }
    this.regRoute = new RegExp(`^${routeArr.join("\/")}$`);
    */
    //this.regRoute = new RegExp("^" + this.route.replace(/:\w+/g, "\\w+"));
  }

  createRegRoute() {
    let routeArr = this.route.split("/");
    routeArr.forEach((part, index) => {
      if (part.startsWith(":")) {
        this.expIndex[part] = index; // save parameter index in route string
        routeArr[index] = "\\w+"; // replace parameter with regex to match any word
      }
    });
    return new RegExp("^" + routeArr.join("/") + "$");
  }

  async _beforeRender(data_in) {
    //await SingApp.showLoader();
    const data = data_in || {exp : {}};
    let retData = {...renderManager,
      element: "main",
      template: `tmpl_${this.templateName}`,
      renderData: data
    };

    if (this.onlyAuth && !(myUser && await myUser.checkToken())) {
      stateManager.changeStateByState(stateManager.states["login"]);
      return false;
    }

    return retData;
  }
  async beforeRender(data_in) {
    return data_in;
  }

  async afterRender(data_in) {
    return true;
  }

  async _afterRender(data_in) {
    const addMove = (btn) => {
      if ("action" in btn.dataset && stateManager.states[btn.dataset["action"]]) {
        btn.onclick = (event) => {
          const sendData = { ...btn.dataset };
          if (btn.dataset.exp)
            sendData.exp = JSON.parse(decodeURI(btn.dataset["exp"]));
          stateManager.changeStateByState(stateManager.states[btn.dataset["action"]], sendData);
        }
      }

      if (btn.id in this.events)
        btn.onclick = this.events[btn.id];

      if (btn.name in this.events)
        btn.onclick = this.events[btn.name];
    }

    $$$("a, .btn").forEach(addMove);
    $.Pages.init();
    searchInit();



    /*$(".select2").each(function () {
      $(this).select2(
        {
          dropdownAutoWidth: true,
          width: '100%',
          ...$(this).data()
        }
      );
    });*/

    //SingApp.hideLoader();
  }
}

class clFrontCatGroup {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
  }
}
class clFrontUser {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? {...data} : {};
  }

  restoreFromStorage() {
    let userData = localStorage.getItem("user");
    if(userData) {
      userData = JSON.parse(userData);
      this.id = userData.id;
      this.fullData = userData;
    }
  }

  async load() {
    const res = await asyncAPI("clUser/load", { idUser: this.id });
    if (res.errorCode) {
      return false;
    }
    else {
      this.fullData = res.user;
      return true;
    }
  }

  async checkToken() {
    
    const res = await asyncAPI("clUser/verifyToken", {});
    if (res.errorCode) {
      return false;
    }
    else {
      if (res.id != this.id) {
        return false;
      }
    }
    
    return true;
  }
  
  async save() {
    
    const res = await asyncAPI("clUser/save", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      return false;
    }
    else {
      this.id = res.id;
      this.fullData = res.fullData;
      return true;
    }
  }
}

class clFrontUserList {
  //static class for work with user list
  userList = [];
  startFrom = 0;
  count = 10;
  sort = "fName, lName";
  
  static async getUserList() {
    const res = await asyncAPI("clUserList/getUserList", { startFrom: this.startFrom, count: this.count, sort: this.sort});
  
    if (res.errorCode) {
      return false;
    }
  
    this.userList = res.rows.map(row => new clFrontUser(row.id, row));
  
    return this.userList;
  }

  static async getUser(id) {
    // get user from array this.userList
    const user = this.userList.find(user => user.id == id);
    return user?user:false;
  }
}