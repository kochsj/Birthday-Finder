function showSpinner() {
  //grab the value
  // check if it meets our critera
  //form.submit
  // Hide the form
  $("#theMain").toggle();
  // shows the spinner
  spinner.className = "show";
  setTimeout(() => {
    spinner.className = spinner.className.replace("show", "");
  }, 5000);
  //
}
