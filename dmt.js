// Curretn session object in memory. Saved and loaded form local storage
var currentSession = new Object();
currentSession.availableHours = 9;
currentSession.sessionName = "";
currentSession.arrayTasks = new Array();
currentSession.status = 'none';
currentSession.starttime = null;
currentSession.lastPage = null;
currentSession.arrayChartRanges = [];
taskCProgressChartInitialized = false;
sessionSecondsLeft = 0;                      // Is assigned value when timer starts and each 2 seconds

// Auth details
var token = '';
var user_id = '';

var availableHours = 9;
var arrayTasks = [];
var sessionName;
var menuButton;
$(document).ready(function () {

  // Load user auth from storage if available and validate token
  validateStoredStorageToken();

  //SaveSessionToLocalStorage(currentSession);
  tmpCurrentSession = ReadSessionFromLocalStorage();
  if(tmpCurrentSession != null) {
    currentSession = tmpCurrentSession;
    console.log(currentSession);
  }
  // Get last page opened previously
  if(currentSession.lastPage != null) {
    $('#inputSessionName').val(currentSession.sessionName);
    beginFromScratch();
    pageSlide('#step-1', currentSession.lastPage);
  }
  else {
    // Begin first screen
    beginFromScratch();
  }

  var dmtUserEmail = localStorage.getItem('dmtUserEmail');



  menuButton = $("#menu-icon");

  // Attach jqxSlider to #sliderHours dom
  //$('#sliderHours').jqxSlider({ ticksPosition:'bottom', tooltip: true, value:availableHours, mode: 'fixed', step: 0.5, max: 12, width: '100%', height: 60, showTickLabels: true, showMinorTicks: true, template:'primary' });

  $('#btntimerStartPause').jqxButton({ height: '35px', theme: 'darkblue'});
  $('#btntimerRestart').jqxButton({ height: '35px', theme: 'darkblue'});
  $('#btntimerNewSession').jqxButton({ height: '35px', theme: 'darkblue'});

  $('#btnLoginEmail').jqxButton({ height: '35px', theme: 'darkblue'});
  $('#btnLoginEmail').on('click', function () {
	// Submit form
	$("#email-login-form").submit();	
  });

  $( "#email-login-form" ).submit(function( event ) {
	//var data = JSON.stringify( $( "#email-login-form" ).serializeArray() );
	// var data = objectifyForm($( "#email-login-form" ).serializeArray());
	var strEmail = $( "#loginEmail" ).val();
	var strPassword = $( "#loginPassword" ).val();
	var data = '{"email":"' + strEmail + '", "password":"' + strPassword + '"}';
	console.log(data);
	$.ajax({
		url: 'api.php?action=login',
		type : "POST",
		contentType:"application/json; charset=utf-8",
		dataType : 'json',
		data : data,
		success : function(result) {
		   if(result.success == 1) {
			// Apply auth information to global variables
			token = result.token;
			user_id = result.user_id;
			
			// Store auth information in storage
			localStorage.setItem('user_id', user_id);
			localStorage.setItem('token', token);
			console.log(result);
		   }
		},
		error: function(xhr, resp, text) {
			var response=$.parseJSON(resp);
			console.log(xhr, response, text);
		}

	});
	event.preventDefault();
  });

  $('#inputSessionName').jqxInput({placeHolder: "What should we call today's tasks?", height:'32px', width:'260px', minLength:1 });
  $('#inputAddTask').jqxInput({placeHolder: "Enter a new Task", height:'32px', width:'200px', minLength:1 });
  $("#btnSubmitSessionName").jqxButton({ height: '35px', theme: 'darkblue'});
  $('#btnGoToAddTasksPage').jqxButton({ height: '35px', theme: 'darkblue'});
  $("#btnaddTask").jqxButton({ height: '35px', theme: 'darkblue'});
  $("#task-list-container").jqxSortable({axis: 'y', appendTo: 'document.body'});

  // Input form
  $('#loginEmail').jqxInput({placeHolder: "Your email", height:'32px', width:'200px', minLength:1 });
  $('#loginPassword').jqxInput({placeHolder: "Your password", height:'32px', width:'200px', minLength:1 });

  $(menuButton).on("click", function() {
	if($(menuButton).hasClass('is-active')) {
		$(menuButton).removeClass('is-active');
		closeNav();
	}
	else {
		$(menuButton).addClass('is-active');
		openNav();
	}
  });

  $('#btnSubmitSessionName').on("click", function() { beginSession(); });
  $('#btnGoToAddTasksPage').on("click", function() {
	availableHours = $('#sliderHours').jqxSlider('value');
	pageSlide('#step-2', '#step-3');
  });
  



  // Click Add subject button
  $("#btnaddTask").on("click", function() {
	var newTask = $('#inputAddTask').val();
	addTaskToTaskList(newTask);
	updateTaskArrayFromContainer();
  });

  // Click remove task icon event
  $("#task-list-container").on( "click", ".task-remove", function() {
	var taskElem = $(this).parent();
	var taskElemId = taskElem.attr('id');
	var taskId = taskElem.data('task-id');
	var sliderToDestroy = $(this).parent().find(".jqx-slider");
	sliderToDestroy.jqxSlider('destroy');
	taskElem.velocity("transition.slideLeftBigOut", { duration: 300, complete: function()
		{
		taskElem.remove(); updateTaskArrayFromContainer();
		}
	});
	updateTaskArrayFromContainer();
  });

  // When sorting is finished
  $('#task-list-container').on('stop', function () {
	updateTaskArrayFromContainer();
  });

  
  // Click Start / Pause button
  $("#btntimerStartPause").on("click", function() {
	StartPauseTimer();
  });


  // Start the timer
  setInterval(sessionTimerTick,2000);

});

function StartPauseTimer() {
  if($("#btntimerStartPause").val() == 'h') {
	if(currentSession.arrayTasks.length > 0) {
		// Start timer
		$("#btntimerStartPause").val('b');
		currentSession.status = 'started';
		currentSession.starttime = new Date();
		SaveSessionToLocalStorage(currentSession);
		if(currentSession.lastPage == '#step-3') {
			pageSlide('#step-3', '#step-4');
		}
		// Refresh the Bullet Chart
		calcTaskProgressChartRanges();
		initTaskprogressionChart();
		sessionSecondsLeft = (currentSession.availableHours * 60) * 60;
	}
	else { return; }
  }
  else {
	$("#btntimerStartPause").val('h');
  }
}

function updateTaskArrayFromContainer() {
  $('#task-list-container').jqxSortable('refresh');
  //var currentSession.arrayTasks = [];
  currentSession.arrayTasks.splice(0,currentSession.arrayTasks.length)
  var taskPriority = 0;
  $("#task-list-container").children().each(function() {
	taskPriority = taskPriority + 1;
	taskElemId = $(this).data('task-id');
	taskElemName = $(this).data('task-name');
	taskElemColor = $(this).data('task-color');
	taskElemHours = $(this).data('task-hours');
	objTask = {id:taskElemId, name:taskElemName, priority:taskPriority, progress:0, estimatedhours:taskElemHours, color:taskElemColor};
	currentSession.arrayTasks.push(objTask);
	// Change this object as well
	$(this).find('span.spanPriority').html('Priority: ' + taskPriority);
	// Update task statuses
	updateRemainingTimeWidgets(availableHours*60);
  });
  // IGOR TEST REMOVE
  SaveSessionToLocalStorage(currentSession);
}

function updateContainerFromTaskArray() {
  $("#task-list-container").children().each(function() {
    var taskElem = $(this);
    var taskElemId = taskElem.attr('id');
    var taskId = taskElem.data('task-id');
    var sliderToDestroy = $(this).find(".jqx-slider");
    sliderToDestroy.jqxSlider('destroy');
    taskElem.remove();
  });
  $('#task-list-container').jqxSortable('refresh');
  for (var i = 0; i < currentSession.arrayTasks.length; i++) {
	  addTaskToTaskListContainer(currentSession.arrayTasks[i].name, currentSession.arrayTasks[i].id, currentSession.arrayTasks[i].priority, currentSession.arrayTasks[i].estimatedhours, currentSession.arrayTasks[i].color);
  }
}

function updateRemainingTimeWidgets(valueMinutes) {
  
  var hours = Math.floor( valueMinutes / 60); 
  $('#remaining-hours').html(hours);


  $('#tasks-progression-container').empty();
  for (var i = 0; i < currentSession.arrayTasks.length; i++) {
    var html = '<li id="task-status-id-' + currentSession.arrayTasks[i].id + '"><div class="timepercent-left" style="background:' + currentSession.arrayTasks[i].color + ';"></div><h4>' + currentSession.arrayTasks[i].name + '</h4><div class="task-status-img"></div></li>';
    $('#tasks-progression-container').append(html);
  }
}


function addTaskToTaskList(taskName) {
  // Adds to array and then to UI softable list container
  if(taskName.length == 0) { alert('Enter a task'); return; }
  var defaultEstimatedHours = 0;
  var objTask;
  console.log(currentSession);
  if(currentSession.arrayTasks.length == 0) {
	defaultEstimatedHours = Math.round((availableHours / 4), 1);
	objTask = {id:1, name:taskName, priority:1, progress:0, estimatedhours:defaultEstimatedHours, "color":getRandomColor()};
  }
  else {
	//defaultEstimatedHours = Math.round((availableHours / currentSession.arrayTasks.length), 1);
	defaultEstimatedHours = 4;
	var highestId = 0;
	var highestPriorityInt = 0;
	for (var i = 0; i < currentSession.arrayTasks.length; i++) {
		if(currentSession.arrayTasks[i].id > highestId) { highestId = currentSession.arrayTasks[i].id }
		if(currentSession.arrayTasks[i].priority > highestPriorityInt) { highestPriorityInt = currentSession.arrayTasks[i].priority }
		if(currentSession.arrayTasks[i].name == taskName) {
			alert('Task already exists');
			return;
		}
	}
	highestId = highestId + 1;
	highestPriorityInt = highestPriorityInt + 1;
	objTask = {id:highestId, name:taskName, priority:highestPriorityInt, progress:0, estimatedhours:defaultEstimatedHours, "color":getRandomColor()};
  }
  currentSession.arrayTasks.push(objTask);
  addTaskToTaskListContainer(objTask.name, objTask.id, objTask.priority, objTask.estimatedhours, objTask.color);

}

function addTaskToTaskListContainer(taskName, taskId, priority, estimatedHours, color) {
	var html = '<li id="task_' + taskId + '" data-task-id="' + taskId + '" data-task-name="' + taskName + '" data-task-hours="' + estimatedHours + '" data-task-color="' + color + '" style="background:' + color + '"><h3>' + taskName + '</h3><span class="spanPriority">Priority: ' + priority + '</span> <div> <div style="float:left; width:26%;"><span class="spanHours" style="margin-top:8px; display:block">Estim. hours:</span></div> <div style="float:left; width:72%;"><div class="task-slider-hours" id="taskSliderHours_' + taskId + '"></div></div> </div>  <div class="task-remove jqx-slider-button jqx-button jqx-widget jqx-fill-state-normal"><img class="icon-close" src="js/jqwidgets/styles/images/close.svg"></div></li>';
	$("#task-list-container").append(html);
	// Add jqxSlider to hours slider
	$('#taskSliderHours_' + taskId).jqxSlider({ height:"45px", showButtons: false, template: "default", tooltip: true, mode: 'default', step: 0.25, value:estimatedHours, max: availableHours, width: '100%', showTickLabels:true, showMinorTicks: true, ticksPosition:'top' });
}


function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("canvas").style.marginLeft = "250px";
}
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("canvas").style.marginLeft = "0";
}

function getRandomColor() {
  var letters = 'BCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
      color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

// When "Let's start" is clicked
function beginSession() {
  var value = $('#inputSessionName').jqxInput('val');
  //alert(value);
  if(value.length > 1) { currentSession.sessionName = $('#inputSessionName').val(); }
  
  pageSlide('#step-1', '#step-2')
  // $('#step-1').velocity("transition.slideLeftBigOut", { duration: 1000 });
}

function beginFromScratch() {
  $('#step-1').velocity("transition.slideRightBigIn", { duration: 1000 });
}



function pageSlide(outPage, inPage) {
  $(outPage).velocity("transition.slideLeftBigOut", { duration: 1000, complete: function() {
	$(inPage).velocity("transition.slideLeftBigIn", { duration: 1000, complete: function() {
		if(inPage == '#step-2') {
			$('#sliderHours').jqxSlider({ ticksPosition:'bottom', tooltip: true, value:availableHours, mode: 'fixed', step: 0.5, max: 12, width: '100%', height: 60, showTickLabels: true, showMinorTicks: true, template:'primary' });
			$('#sliderHours').velocity("transition.slideRightBigIn", { duration: 400 });
			$('#sliderHours').on('slideEnd', function (event) { availableHoursSliderChanged(event.args.value); });
		}
		if(inPage == '#step-3') {

			if(currentSession.arrayTasks.length > 0) {
				updateContainerFromTaskArray();
			}
		}
		// Set local storage 'lastPage item
		currentSession.lastPage = inPage;
		localStorage.setItem('lastPage', inPage);
	   }
	 });

  }
 });
  
}

function SaveSessionToLocalStorage(objSession) {
  // Saves only current session / overwrite
  var jsonSession = JSON.stringify(objSession);
  console.log(jsonSession);
  localStorage.setItem('currentSession', jsonSession);
}
function ReadSessionFromLocalStorage() {
  var jsonString = localStorage.getItem('currentSession');
  console.log('jsonString: ' + jsonString);
  return JSON.parse(jsonString);
}
function restartSession() {
  // Delete local storage about current session
  localStorage.removeItem('currentSession');
  localStorage.removeItem('lastPage');
  currentSession.availableHours = 9;
  currentSession.sessionName = "";
  currentSession.arrayTasks = new Array();
  currentSession.status = 'none';
  currentSession.starttime = null;
  currentSession.lastPage = null;
  location.reload();
}

function returnSqlDate(objDate) {
  // Used for preparing data for SQL string. Expects var of new Date()
  var strDate = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate() + ' ' + today.getHours() + ':' + today.getMinutes() + ':00';
  return strDate;
}

function initTaskprogressionChart() {
  $('#task-progression-chart').jqxBulletChart({
                width: $(this).parent().width(),
                height: 80,
                barSize: "60%",
                ranges: currentSession.arrayChartRanges,
                pointer: { value: currentSession.availableHours, label: "", size: "2", color: "Black" },
                target: { value: currentSession.availableHours, label: "", size: 2, color: "transparent" },
                ticks: { position: "both", interval: 2, size: 10 },
		title: "",
		description: "",
		orientation: "horizontal",
                showTooltip: true,
		animationDuration:0
  });
  taskCProgressChartInitialized = true;
}

function calcTaskProgressChartRanges() {
  currentSession.arrayChartRanges = [];
  var arrayTasksModifiedHours = [];
  // get total combined estimated hours from all tasks
  var totalEstimatedTaskHours = 0;
  for (var i = currentSession.arrayTasks.length-1; i > -1; i--) {
  // for (var i = 0; i < arrayTasks.length; i++) {
	arrayTasksModifiedHours.push(currentSession.arrayTasks[i]);
	totalEstimatedTaskHours = totalEstimatedTaskHours + currentSession.arrayTasks[i].estimatedhours;
  }
  if(totalEstimatedTaskHours > availableHours) {
	for (var i = 0; i < arrayTasksModifiedHours.length; i++) {
		
	}
  }
  var lastEndValue = 0;
  var startValue = 0;
  var endValue = 0;
  for (var i = 0; i < arrayTasksModifiedHours.length; i++) {
	// calculate percentage
	var taskPercentage = arrayTasksModifiedHours[i].estimatedhours / totalEstimatedTaskHours  * 100;
	
	startValue = 0;
	endValue = 0;
	if(i == 0) {
		startValue = 0;
		endValue = Math.round((availableHours / 100) * taskPercentage, 2);
		var objChartRange = {startValue:startValue, endValue:endValue, color:arrayTasksModifiedHours[i].color, opacity: 0.5};
		currentSession.arrayChartRanges.push(objChartRange);
		lastEndValue = endValue;
	}
	else if(i == arrayTasksModifiedHours.length-1) {
		startValue =  lastEndValue;
		endValue = availableHours;
		var objChartRange = {startValue:startValue, endValue:endValue, color:arrayTasksModifiedHours[i].color, opacity: 0.5};
		currentSession.arrayChartRanges.push(objChartRange);
		lastEndValue = endValue;
	}
	else {
		startValue =  lastEndValue;
		endValue = Math.round((availableHours / 100) * taskPercentage, 2) + startValue;
		var objChartRange = {startValue:startValue, endValue:endValue, color:arrayTasksModifiedHours[i].color, opacity: 0.5};
		currentSession.arrayChartRanges.push(objChartRange);
		lastEndValue = endValue;
	}
  }
  var objChartRange = {startValue:lastEndValue, endValue:availableHours, color:"#000000", opacity: 0.5};
  currentSession.arrayChartRanges.push(objChartRange);
  console.log(currentSession.arrayChartRanges);
}


function sessionTimerTick() {
  // Executed every 2 seconds
  if(currentSession.status == 'started' && taskCProgressChartInitialized == true) {
	// Get minutes left
	sessionSecondsLeft = sessionSecondsLeft -2;
	sessionHoursLeft = (sessionSecondsLeft / 60) / 60;
	// sessionHoursLeft = sessionHoursLeft - 0.5;
	console.log(sessionHoursLeft);
	calcTaskProgressChartRanges();
	$('#task-progression-chart').jqxBulletChart({ pointer: { value: sessionHoursLeft, label: "", size: "2", color: "Black" } });
	$('#task-progression-chart').jqxBulletChart({ranges: currentSession.arrayChartRanges });
	$('#task-progression-chart').jqxBulletChart('refresh');
  }
}

function availableHoursSliderChanged(value) {
  currentSession.availableHours = value;
  // Update all the tasks UI sliders
  $elemCount = $("#task-list-container .jqx-slider");
  if($elemCount.length != 0) {
	$('#task-list-container .jqx-slider').jqxSlider({ max: value });
	updateTaskArrayFromContainer();
  }
  // Refresh the bullet chart
  calcTaskProgressChartRanges();
  initTaskprogressionChart();
}


function loginUserEmail() {
  var loginEmail = $('#loginEmail').val();
  alert(loginEmail);
}

function objectifyForm(formArray) {//serialize data function
  var returnArray = {};
  for (var i = 0; i < formArray.length; i++){
    returnArray[formArray[i]['name']] = formArray[i]['value'];
  }
  return returnArray;
}

function validateStoredStorageToken() {
  var storedToken = localStorage.getItem('token');
  console.log('stored token: ' + storedToken);

  var data = '{"user_id":' + user_id + ', "token":"' + storedToken + '"}';
  console.log(data);
  $.ajax({
	url: 'api.php?action=validatetoken',
	type : "POST",
	contentType:"application/json; charset=utf-8",
	dataType : 'json',
	data : data,
	success : function(result) {
		console.log(result);
	},
	error: function(xhr, resp, text) {
		var response=$.parseJSON(resp);
		console.log(xhr, response, text);
	}

  });
}


