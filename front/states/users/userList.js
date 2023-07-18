//popupTemplates.push("editUserPopup");

_USL = stateManager.addState("userList", "/cabinet/userList", true);

_USL.beforeRender = async (data_in) => {
  
  data_in.parentTemplate = {
    element: "main",
    name: "tmpl_main"
  };
  data_in.element = "mainContent";
  data_in.renderData.userList = await clFrontUserList.getUserList();

  return data_in;
}

/*_USL.events.btnUserEdit = async (e) => {
  const id = $$("#btnUserEdit").dataset["id"];
  _USL.currentUser = await clFrontUserList.getUser(id);
  $('#editUserPopup').replaceWith($.render["tmpl_editUserPopup"](_USL.currentUser.fullData));
  $$("#avatarLoader").addEventListener('change', _USL.events.avatarLoader, false);
  $('#editUserPopup').modal('show');
}*/

_USL.afterRender = async (data_in) => {
  $("#tblUserList").DataTable({
    "sDom": "<t><'row'<p i>>",
    "destroy": true,
    "scrollCollapse": true,
    data: data_in.userList,
    columns: [
      { data: "fullData.fName" },
      { data: "fullData.lName" },
      { data: "fullData.mName" },
      { data: "fullData.email" },
      { data: "fullData.phone" },
      {
        data: "fullData.created", render: function (data, type, row) {
          return moment(data).format('DD.MM.YY HH:mm:ss');
        }
      },
      {
        data: "", render: function (data, type, row) {
          return $.render["tmpl_userListActions"]({ id: row.fullData.id });
        }
      }
    ]
  });

  

  return data_in;
}

_USL.events.btnUserSave = async (e) => {
  
  if (_USL.validator.form()) {
    const res = await _USL.currentUser.save();
    if (res) {
      $('#editUserPopup').modal('hide');
      stateManager.changeStateByState(_USL);
    }
  }
}