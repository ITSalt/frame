class clFrontCatItem {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
  }

  async save() {
    const res = await asyncAPI("clCatItem/save", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else {
      return true;
    }
  }

  async load() {
    const res = await asyncAPI("clCatItem/load", { id: this.id });
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