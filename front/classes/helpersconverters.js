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