<?php

session_set_cookie_params(0);
session_start();

$state = Array(
    'loggedIn' => false
);

$db = new PDO('mysql:host=localhost;dbname=dividemytime;charset=utf8', 'dmtuser', 'DTM0987654321');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); //uncomment to see SQL errors

//if there is an active session
if (isset($_SESSION['username']))
{
  
}
else {
    //
}

/* Example query

    //configure the $name variable
    foreach ($db -> query("SELECT name FROM users WHERE username='" . $username . "'") as $row)
    {
        $name = $row['name'];
    }

*/

?>