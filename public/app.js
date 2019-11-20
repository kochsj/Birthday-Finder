function showSpinner() {
  // Hide the form
  $("#searches-form").toggle();
  spinner.className = "show";
  setTimeout(() => {
    spinner.className = spinner.className.replace("show", "");
  }, 5000);
}
