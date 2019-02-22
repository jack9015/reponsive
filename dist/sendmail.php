<?php
require 'vendor/autoload.php'; // If you're using Composer (recommended)

// export SENDGRID_API_KEY='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'

// $key = getenv('SENDGRID_API_KEY'); 

use \SendGrid\Mail\From as From;
use \SendGrid\Mail\To as To;
use \SendGrid\Mail\Subject as Subject;
use \SendGrid\Mail\PlainTextContent as PlainTextContent;
use \SendGrid\Mail\HtmlContent as HtmlContent;
use \SendGrid\Mail\Mail as Mail;
$data = [
    'error'=>false
];
if((isset($_POST['link'])) && isset($_POST['email'])){

    if((($_POST['link'] != '')) && ($_POST['email'] != '')){

    
        $key = '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';
        $toUser = $_POST['email'];
        $inviteLink = $_POST['link'];
        $templateId = "d-17f3a280dfcd4f44a9a6452867b18d28";

        $from = new From("admin@gettalkee.com", "Talkee Admin");
        $tos = [ 
            new To(
                $toUser
            ),
        ];


        $email = new Mail(
            $from,
            $tos
        );

        $substitutions = [
            "invite_link" => $inviteLink,
        ];
        $email->addDynamicTemplateDatas($substitutions);
        $email->setSubject("Invitation to Talkee2");
        $email->setTemplateId($templateId);
        $sendgrid = new \SendGrid($key);
        try {
            $response = $sendgrid->send($email);
            if($response->statusCode() != '202'){
                $data = [
                    'error'=>true
                ];
            }
        } catch (Exception $e) {
            // echo 'Caught exception: '.  $e->getMessage(). "\n";
            $data = [
                'error'=>true
            ];
        }

    }   

}


$myJSON = json_encode($data);
echo $myJSON;