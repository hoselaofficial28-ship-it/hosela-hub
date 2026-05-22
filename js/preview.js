function togglePreview() {
 var isPhone = document.body.classList.toggle('phone-mode');
 var btn = document.querySelector('.preview-btn');
 if (isPhone) {
 btn.innerHTML = ' Keluar Preview';
 window.scrollTo(0,0);
 } else {
 btn.innerHTML = ' Preview HP';
 }
}