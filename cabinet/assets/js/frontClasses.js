allConverters = {
  "console": (data) => {
    console.log(data);
  },
  "stateRouteByName": (stateName) => {
    return stateName in stateManager.states ? stateManager.getParsedRoute(stateName) : "/err404";
  },
};

allHelpers = {
  
};
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
    renderData = await newState.beforeRender(renderData);

    stateManager.getParsedRoute(newState, renderData.data.exp);

    if ($.render[renderData.template]) {
      const element = $$(`#${renderData.element}`);
      if (element) {
        element.innerHTML = $.render[renderData.template](renderData.data);
      } else {
        console.error("TMPL ERR: Cannot find ", renderData.template);
      }
    }

    await newState.afterRender(renderData.data);
    await newState._afterRender(renderData.data);

    const url = `${stateManager.states[newState.name].parsedRoute}${data.exp.urlPostfix ? `/#${data.exp.urlPostfix}` : ""}`;
    window.history.pushState(renderData.data, newState.name, url);

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
    let retData = {
      element: "main",
      template: `tmpl_${this.templateName}`,
      data: data
    };

    if (this.onlyAuth && (!myUser || !myUser.data.token)) {
      retData.template = "tmpl_login";
      retData.data = {};
      //myState.beforeLoginName = this.name;
      //myState.beforeLoginData = data;

      return retData;
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
          changeStateByState(stateManager.states[btn.dataset["action"]], sendData);
        }
      }

      if (btn.id in this.events)
        btn.onclick = this.events[btn.id];

      if (btn.name in this.events)
        btn.onclick = this.events[btn.name];
    }

    $$$("a, .btn").forEach(addMove);
    $.Pages.init();

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
