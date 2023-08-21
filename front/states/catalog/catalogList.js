_CTL = stateManager.addState("catalogList", "/cabinet/catalogList/:idParentCatGroup", true);

_CTL.beforeRender = async (data_in) => {
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";

  data_in.renderData.catalogList = await clFrontCatGroupList.load(data_in.renderData.exp.idParentCatGroup);
  data_in.renderData.catalogList.push(new clFrontCatGroup("new", {id: "new", name: "Новая группа", description: "", image: "", idParent: data_in.renderData.exp.idParentCatGroup || null }));
  data_in.renderData.parentGroup = new clFrontCatGroup(data_in.renderData.exp.idParentCatGroup);
  await data_in.renderData.parentGroup.load();
  await data_in.renderData.parentGroup.loadParentList();

  console.log(data_in.renderData.parentGroup);

  return data_in;
}

_CTL.events.btnSaveGroup = async (e) => {
  const idGroup = e.target.dataset["id"];

  if (_CTL.validator[idGroup].form()) {
    const group = await clFrontCatGroupList.getGroupById(idGroup);
    if (!group) {
      console.error("Group not found");
      return false;
    }

    group.fullData.name = $$(`[name=catGroupName${idGroup}]`).value;
    group.fullData.description = $$(`[name=catGroupDesc${idGroup}]`).value;
    
    
    const res = await group.save();
    if (res.errorCode) {
      console.error(res);
    }
    else {
      stateManager.changeStateByRoute();
      showNotify("Группа сохранена");
    }
  }
}

_CTL.events.btnDeleteGroup = async (e) => {
  const idGroup = e.target.dataset["id"];
  const group = await clFrontCatGroupList.getGroupById(idGroup);
  if (!group) {
    console.error("Group not found");
    return false;
  }

  group.fullData.isDeleted = "YES";
  const res = await group.save();
  if (res.errorCode) {
    console.error(res);
  }
  else {
    stateManager.changeStateByRoute();
    showNotify("Группа удалена");

  }
}


_CTL.events.imageLoader = async (e) => {
  const idGroup = e.target.dataset["id"];
  const group = await clFrontCatGroupList.getGroupById(idGroup);
  if (!group) {
    console.error("Group not found");
    return false;
  }
  imageLoader(`[name=catGroupImage${idGroup}]`, `#catGroupImageFile${idGroup}`, (data) => { group.fullData.newImage = data; });
}

_CTL.afterRender = async (data_in) => {

  $$("#catBread").innerHTML = $.render["tmpl_catalogBread"](data_in.parentGroup);
  _CTL.validator = {};
  for(let i = 0; i < data_in.catalogList.length; i++) {
    const idGroup = data_in.catalogList[i].id;
    const messages = {};
    messages[`catGroupImageFile${idGroup}`] = { required: "Без картинки грустно" };
    messages[`catGroupName${idGroup}`] = { required: "Без название никак" };
    messages[`catGroupDesc${idGroup}`] = { required: "Без описания грустно" };

    _CTL.validator[idGroup] = $(`#fmEditGroup${idGroup}`).validate(
      {
        messages : messages
      }
    );

    $$(`#catGroupImageFile${idGroup}`).addEventListener('change', _CTL.events.imageLoader, false);
  }
}