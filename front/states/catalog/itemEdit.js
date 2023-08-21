_EIT = stateManager.addState("editItem", "/cabinet/catalogList/:idParentCatGroup/editItem/:idItem", true);

_EIT.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.exp.idItem = data_in.renderData.exp.idItem || "new";

  _EIT.item = new clFrontCatItem(data_in.renderData.exp.idItem);
  _EIT.item.fullData.idGroup = data_in.renderData.exp.idParentCatGroup;
  if (data_in.renderData.exp.idItem != "new")
    await _EIT.item.load();
  
  data_in.renderData.item = _EIT.item;
   
  console.log(data_in.renderData.item);

  return data_in;
}

_EIT.afterRender = async (data_in) => {
  $$("#catItemImageFile").addEventListener('change', _EIT.events.imageLoader, false);
  _EIT.validator = $('#fmEditItem').validate(
    {
      messages: {
        catItemName: { required: "Без имени никак" }
      }
    }
  );
}

_EIT.events.imageLoader = async (e) => {
  imageLoader("#catItemImage", "#catItemImageFile", (data) => { _EIT.item.fullData.newImage = data; });
}

_EIT.events.btnSaveItem = async (e) => {
  if (_EIT.validator.form()) {
    _EIT.item.fullData.name = $$("[name=catItemName]").value;
    _EIT.item.fullData.description = $$("[name=catItemDesc]").value;
    _EIT.item.fullData.slangTags = $$("[name=catItemSlang]").value;
    await _EIT.item.save();
    const parentItem = new clFrontCatGroup(_EIT.item.fullData.idGroup);
    await parentItem.load();
    stateManager.changeStateByState("catalogList", parentItem.fullData.idParent ? { exp : {idParentCatGroup: parentItem.fullData.idParent} } : {});
    showNotify("Товар сохранен");
  }
}