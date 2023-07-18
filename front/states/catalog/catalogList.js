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