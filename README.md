# IdleCyber-auto
- Tạo account Object và đăng nhập:
  
  var account = new IdleCyber(email, password);
  
  await account.login();
  
  **password là chuỗi mã hoá (xem ở phần network khi đăng nhập bằng trình duyệt)
  
- Chọn đối thủ
  
  var opponent = await bestOpponent(account, whiteLists)
  
  **account là IdleCyber object đã tạo ở trên
 
  **whiteLists là danh sách những đối thủ ưu tiên (xem định dạng ở file whileList.json

  
