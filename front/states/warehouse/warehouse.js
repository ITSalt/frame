_WH = stateManager.addState("warehouse", "/cabinet/warehouse", true);

_WH.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.warehouse = await clFrontWarehouse.load();

  return data_in;

};