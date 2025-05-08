const GenResponse = (success: boolean, msg: string, data?: any) => {
  return {
    success,
    msg,
    data: data != null ? data : null,
  };
};

export { GenResponse };
