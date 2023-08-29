class clFrontUser {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? {...data} : {};
  }

  restoreFromStorage() {
    let userData = localStorage.getItem("user");
    if(userData) {
      userData = JSON.parse(userData);
      this.id = userData.id;
      this.fullData = userData.fullData;
    }
  }

  async load() {
    const res = await asyncAPI("clUser/load", { idUser: this.id });
    if (res.errorCode) {
      return false;
    }
    else {
      this.fullData = res.user;
      return true;
    }
  }

  async checkToken() {
    
    const res = await asyncAPI("clUser/verifyToken", {});
    if (res.errorCode) {
      return false;
    }
    else {
      if (res.id != this.id) {
        return false;
      }
    }
    
    return true;
  }
  
  async save() {
    
    const res = await asyncAPI("clUser/save", { id: this.id, data: this.fullData });
    if (res.errorCode) {
      return false;
    }
    else {
      this.id = res.id;
      this.fullData = res.fullData;
      return true;
    }
  }
}

class clFrontUserList {
  //static class for work with user list
  userList = [];
  startFrom = 0;
  count = 10;
  sort = "fName, lName";
  
  static async getUserList() {
    const res = await asyncAPI("clUserList/getUserList", { startFrom: this.startFrom, count: this.count, sort: this.sort});
  
    if (res.errorCode) {
      return false;
    }
  
    this.userList = res.rows.map(row => new clFrontUser(row.id, row));
  
    return this.userList;
  }

  static async getUser(id) {
    // get user from array this.userList
    const user = this.userList.find(user => user.id == id);
    return user?user:false;
  }
}