_SWH = stateManager.addState("sellerWH", "/cabinet/sellerwarehouse", true);

_SWH.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_sellerCat"
  };
  data_in.element = "mainContent";
 
  const wh = await clFrontWarehouse.load();
  data_in.renderData.warehouse = wh.byId;
  data_in.renderData.catalogList = await clFrontCatGroupList.loadOnlyWH(data_in.renderData.exp.idParentCatGroup);
  _SWH.openOrder = new clFrontOrder();
  await _SWH.openOrder.load(true);

  return data_in;

};

_SWH.afterRender = async (data_in) => {
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $('#mainContent').after($.render['tmpl_swhModalForDel']());
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  return data_in;
}

_SWH.events.btnAddToOrder = async (e) => {
  const idItem = e.target.dataset.id;
  const orderQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  const whItem = clFrontWarehouse.getWHbyItemId(idItem);
  if (whItem.quantity < orderQuantity) {
    showNotify("На складе недостаточно товара!");
    return;
  }
  let orderPosition = _SWH.openOrder.fullData.positions.find(pos => pos.idItem == idItem);
  if (orderPosition) {
    orderPosition.orderQuantity = orderQuantity;
  }
  else {
    orderPosition = new clFrontOrderPosition("new", { idWH: whItem.id, orderQuantity, idOrder: _SWH.openOrder.id });
    _SWH.openOrder.fullData.positions.push(orderPosition);
  }
  await orderPosition.save();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  showNotify("Товар успешно добавлен!");
}

_SWH.events.btnOneClickSend = async (e) => {
  showNotify("Заработает чуть позже", "top-right", "danger", "Немного терпения");
}

_SWH.events.btnDelOrderPos = async (e) => {
  _SWH.idPosForDel = e.currentTarget.dataset.id;
  $('#modalConfirmDelOrderPos').modal('show');
}

_SWH.events.btnDelOrderPosConfirmed = async (e) => {
  const orderPosition = _SWH.openOrder.fullData.positions.find(pos => pos.id == _SWH.idPosForDel);
  await orderPosition.delete();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  if (_SWH.openOrder.fullData.positions.length) {
    $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  }
  showNotify("Товар успешно удален!", "top-left");
}

_SWH.events.btnSendOrder = async (e) => {

  if (_SWH.openOrder.fullData.positions.length == 0) {
    showNotify("Ваша корзина пуста!", "top-left", "danger");
    return;
  }

  const res = await _SWH.openOrder.sendOrder();
  await _SWH.openOrder.load(true);
  $$('#orderListBody').innerHTML = $.render['tmpl_sellerBasket']({ order: _SWH.openOrder.fullData });
  $$('#badgeBasketCount').innerHTML = _SWH.openOrder.fullData.positions.length;
  if (_SWH.openOrder.fullData.positions.length) {
    $$('[name=btnSendOrder]').onclick = _SWH.events.btnSendOrder;
  }
  if (res) {
    stateManager.changeStateByState("sellerWH");
    showNotify("Заказ успешно отправлен!", "top-left", "success");
  } 
  
}

_SWH.events.btnMinus = async (e) => {
  const idItem = e.target.dataset.id;
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = currentQuantity - 1;
  if (currentQuantity == 1) {
    e.target.disabled = true;
  }
  $$(`#btnPlus${idItem}`).disabled = false;
}

_SWH.events.btnPlus = async (e) => {
  const idItem = e.target.dataset.id;
  const whItem = clFrontWarehouse.getWHbyItemId(idItem);
  const currentQuantity = Number($$(`[name=quant${idItem}]`).value).toFixed(2);
  $$(`[name=quant${idItem}]`).value = Number(currentQuantity) + 1;
  $$(`#btnMinus${idItem}`).disabled = false;
  if (parseFloat(whItem.quantity) == parseFloat(currentQuantity) + 1) {
    e.target.disabled = true;
  }
}