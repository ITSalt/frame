class clFrontUser {
  constructor(id, data, token) {
    this.id = id;
    this.fullData = data ? {...data} : {};
    this.token = token;
  }

  restoreFromStorage() {
    let userData = localStorage.getItem("user");
    let token = localStorage.getItem("token");
    if(token && userData) {
      userData = JSON.parse(userData);
      this.id = userData.id;
      this.fullData = userData;
      this.token = token;
    }
  }

  async checkToken() {
    if (!this.token)
      return false;
    const res = await asyncAPI("clUser/verifyToken", { token: this.token });
    if (res.errorCode) {
      this.token = null;
      return false;
    }
    else {
      if (res.id != this.id) {
        this.token = null;
        return false;
      }
    }
    
    return true;
  }

  async refreshToken() {
    const res = await asyncAPI("clUser/refreshTokenLifetime", { token: this.token });
    if (res.errorCode) {
      this.token = null;
      return false;
    }
    this.token = decodeURI(res);
    localStorage.setItem("token", this.token);
    return true;
  }
    
}