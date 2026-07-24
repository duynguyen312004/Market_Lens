export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  }

  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng.'
  }

  if (message.includes('email not confirmed')) {
    return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn.'
  }

  if (message.includes('user already registered')) {
    return 'Email này đã được đăng ký.'
  }

  if (message.includes('password should be')) {
    return 'Mật khẩu chưa đáp ứng yêu cầu bảo mật.'
  }

  if (message.includes('rate limit')) {
    return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.'
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Không thể kết nối tới dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.'
  }

  if (message.includes('same password')) {
    return 'Mật khẩu mới cần khác mật khẩu hiện tại.'
  }

  if (
    message.includes('current password') ||
    message.includes('reauthentication')
  ) {
    return 'Mật khẩu hiện tại chưa đúng. Vui lòng kiểm tra lại.'
  }

  if (message.includes('session') || message.includes('expired')) {
    return 'Liên kết đã hết hạn hoặc phiên không còn hợp lệ.'
  }

  return error.message
}
