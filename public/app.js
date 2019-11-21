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
  }, 6000);
  //
}



$("#open-button").hover(function(){
  $("#myForm").toggle();
  $('#callToAction').toggle();
});


function closeForm() {
  $("#myForm").toggle();
  $('#callToAction').toggle();
}

var typed = new Typed(".typedelement", {
  strings: ["What Happened", "On the day you were born?"],
  typeSpeed: 40
});
