
<?php

if ( 0 < $_FILES['file']['error'] ) {
    echo 'Error: ' . $_FILES['file']['error'] . '<br>';
}
else {
    $dt = date(time());
    $filePath = 'uploads/' . $dt.'-'.$_FILES['file']['name'];
    move_uploaded_file($_FILES['file']['tmp_name'], $filePath);
    $data = [
        'filePath'=>$filePath
    ];
    $myJSON = json_encode($data);
    echo $myJSON;
}

?>