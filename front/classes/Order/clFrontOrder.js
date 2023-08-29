class clFrontOrderPosition {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
  }

  async load() {
    const res = await asyncAPI("clOrderPosition/load", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else { 
      this.fullData = res.rows[0];
      return true;
    }
  }

  async save() {
    const res = await asyncAPI("clOrderPosition/addToOrder", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else { 
      this.fullData = res.rows[0];
      this.id = this.fullData.id;
      return true;
    }
  }

  async delete() {
    const res = await asyncAPI("clOrderPosition/delete", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else { 
      this.fullData = {};
      this.id = "new";
      return true;
    }
  }

}

class clFrontOrder {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
    this.fullData.positions = this.fullData.positions || [];
  }

  async load(open = false) {
    const address = open ? "clOrder/openOrder" : "clOrder/load";
    const res = await asyncAPI(address, { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else { 
      this.fullData = res.rows[0];
      this.id = this.fullData.id;
      this.fullData.positions = this.fullData.positions.map((pos) => new clFrontOrderPosition(pos.id, pos));
      return true;
    }
  }

  async sendOrder() {
    const res = await asyncAPI("clOrder/sendOrder", { id: this.id });
    if (res.errorCode) {
      console.error(res);
      return false;
    }
    else { 
      this.fullData = {};
      this.id = "new";
      return true;
    }
  }
}

class clFrontOrderList {
  static #orders = [];
  
}