_MAIN = stateManager.addState("main", "/cabinet/main", true);

_MAIN.afterRender = async (data_in) => {
  
  $("body").removeClass("horizontal-menu horizontal-app-menu");

  return data_in;
}