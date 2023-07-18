class clFrontCatGroup {
  constructor(id, data) {
    this.id = id;
    this.fullData = data ? { ...data } : {};
  }
}