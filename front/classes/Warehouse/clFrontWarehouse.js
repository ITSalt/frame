class clWHItem {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
  }

  async save() {
    const res = await asyncAPI("clWarehouse/save", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      return true;
    }
  }

  async load() {
    const res = await asyncAPI("clWarehouse/loadOne", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      this.fullData = res.rows[0];
      return true;
    }
  }
}

class clFrontWarehouse {
  static #whItems = [];

  static async load() {
    const me = clFrontWarehouse;
    const res = await asyncAPI("clWarehouse/load", {});

    if (res.errorCode) {
      console.error(res);
      return false;
    }

    me.#whItems = res.rows.map(row => new clWHItem(row.id, row));
    return me.#whItems;
  }
  
}