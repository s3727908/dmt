<?php

//enables display of errors (sometimes)
error_reporting(E_ALL);
ini_set('display_errors', 1);

//required library for the UUID function
require_once('lib/random/random.php');
date_default_timezone_set ('Australia/Melbourne');

//configure the database instance
$db = new PDO('mysql:host=localhost;dbname=dividemytime;charset=utf8', 'dmtuser', 'DTM0987654321');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); //uncomment to see SQL errors

//generates a uuid
function getUUID(){
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

//
//   API
//

// respond to body object
if ($_SERVER['QUERY_STRING'] == "action=login") {
  $response = new authResponse;
  $user_id = 0;
  $postBody = file_get_contents('php://input');
  $data = json_decode($postBody, true);
  $strEmail = $data["email"];
  $strPassword = $data["password"];

  $stmt = $db->prepare("select id from tblUsers where email = ? and password=ENCRYPT(?, 'encoding') and is_enabled=1 ORDER BY id DESC");
  $stmt->bindValue(1, $strEmail, PDO::PARAM_STR);
  $stmt->bindValue(2, $strPassword, PDO::PARAM_STR);


  $cmd = $stmt->execute();
  $rows = $stmt->fetchAll();
  if (empty($rows)) {
	print("Fail");
  }
  else {
	$stmt = null;
	$user_id = $rows[0][0];
	// Create token
	$token = getUUID();
	// set expiry
	$expireDate = new DateTime();
	$expireDate->modify('+1 day');

	// Store token
	$stmt = $db->prepare("INSERT INTO tblTokens (user_id, token, expires) values (?, ?, ?)");
	$stmt->bindValue(1, $user_id, PDO::PARAM_STR);
	$stmt->bindValue(2, $token, PDO::PARAM_STR);
	$stmt->bindValue(3, $expireDate->format('Y-m-d H:i:s'), PDO::PARAM_STR);
	$stmt->execute();
	// Create authResponse instance and return as json
	$response->success = 1;
	$response->user_id = $user_id;
	$response->token = $token;
	print_r(json_encode($response));
  }

  // $db = null;
}
elseif ($_SERVER['QUERY_STRING'] == "action=validatetoken") {
  $response = new authTokenValidateResponse;
  $postBody = file_get_contents('php://input');
  $data = json_decode($postBody, true);
  $strToken = $data["token"];
  $stmt = $db->prepare("select * from tblTokens where token=? and expires > CURDATE() order by id desc limit 1;");
  $stmt->bindValue(1, $strTolen, PDO::PARAM_STR);
  $cmd = $stmt->execute();
  $rows = $stmt->fetchAll();
  if (empty($rows)) {
        $response->success = 0;
  }
  else {
	$response->success = 1;
  }
  $stmt = null;
  print_r(json_encode($response));
}


$db = null;
class authResponse {
  public $success =  0;
  public $user_id = null;
  public $token = null;
}
class authTokenValidateResponse {
  public $success =  0;
}
