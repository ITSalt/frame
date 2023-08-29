class clFrontCatGroup {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
    this.fullData.items = (this.fullData.items && this.fullData.items.length) ? this.fullData.items.map(item => new clFrontCatItem(item.id, item)) : [];
    this.fullData.subGroups = (this.fullData.subGroups && this.fullData.subGroups.length) ? this.fullData.subGroups.map(group => new clFrontCatGroup(group.id, group)) : [];
  }

  async save() {
    const res = await asyncAPI("clCatGroup/save", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      this.id = res.id;
      this.fullData = res.fullData;
      return true;
    }
  }

  async load() {
    const res = await asyncAPI("clCatGroup/load", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      this.fullData = res.rows[0];
      return true;
    }
  }

  async loadParentList() {
    this.parentList = [];

    const res = await asyncAPI("clCatGroup/loadParentList", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      this.parentList = res.rows.reverse();
      return true;
    }
  }
}

class clFrontCatGroupList {
  static #catGroupList = [];
  static #startFrom = 0;
  static #count = 50;
  static #sort = null;

  static async load(idParentCatGroup = null) {

    const me = clFrontCatGroupList;

    const res = await asyncAPI("clCatGroupList/load", { 
      startFrom: me.#startFrom, 
      count: me.#count, 
      sort: me.#sort, 
      idParentCatGroup});

    if (res.errorCode) {
      return false;
    }

    me.#catGroupList = res.rows.map(row => new clFrontCatGroup(row.id, row));

    return me.#catGroupList;
  }

  static async loadOnlyWH(idParentCatGroup = null) {

    const me = clFrontCatGroupList;

    const res = await asyncAPI("clCatGroupList/loadOnlyWH", { 
      startFrom: me.#startFrom, 
      count: me.#count, 
      sort: me.#sort, 
      idParentCatGroup});

    if (res.errorCode) {
      return false;
    }

    me.#catGroupList = res.rows.map(row => new clFrontCatGroup(row.id, row));

    return me.#catGroupList;
  }

  static async getGroupById(id) {
    return clFrontCatGroupList.#catGroupList.find(group => group.id == id);
  }

}