_SCAT = stateManager.addState("sellerCat", "/cabinet/sellercatalog", true);

_SCAT.beforeRender = async (data_in) => {
  /*data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";*/

  const wh = await clFrontWarehouse.load();
  data_in.renderData.warehouse = wh.byId;
  data_in.renderData.catalogList = await clFrontCatGroupList.load(data_in.renderData.exp.idParentCatGroup);

  _SCAT.openOrder = new clFrontOrder();
  await _SCAT.openOrder.load(true);

  return data_in;
 
};

_SCAT.afterRender = async (data_in) => {
  $("body").addClass("horizontal-menu horizontal-app-menu");
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SCAT.openOrder.fullData });
  $('#mainContent').after($.render['tmpl_swhModalForDel']());
  $$('#badgeBasketCount').innerHTML = _SCAT.openOrder.fullData.positions.length;
  return data_in;
}

_SCAT.events.btnSaveWH = async (e) => {
  const idItem = e.target.dataset.id;
  const plusQuantity = $$(`[name=quant${idItem}]`).value;
  const myWh = new clWHItem(null, { idItem, plusQuantity });
  await myWh.save();
  await myWh.loadByItem(idItem);
  if ($$(`#quant${idItem}`))
    $$(`#quant${idItem}`).innerHTML = `${myWh.fullData.quantity}&nbsp;${myWh.fullData.measureUnit}`;
  else
    $(`#btnPlus${idItem}`).after($.render["tmpl_swhQuantLabel"]({ quantity: myWh.fullData.quantity, id : idItem, measureUnit: myWh.fullData.measureUnit }));
    
  showNotify("Товар успешно добавлен!");
}

_SCAT.events.btnMinus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = currentQuantity - 1;
  if (currentQuantity == 1) {
    e.target.disabled = true;
  }
}

_SCAT.events.btnPlus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = Number(currentQuantity) + 1;
  $$(`#btnMinus${idItem}`).disabled = false;
}
