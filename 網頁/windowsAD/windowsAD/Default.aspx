<%@ Page Language="C#" AutoEventWireup="true"
    ResponseEncoding="utf-8"
    ContentType="text/html; charset=utf-8"
%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
</head>
<body>

<%
    string remoteUser = Request.ServerVariables["REMOTE_USER"];
    string authUser   = Request.ServerVariables["AUTH_USER"];

    // 將 "KH\\K18251" 解析成 "K18251"
    string safeUser   = Server.HtmlEncode(remoteUser ?? "");
    string cleanUser  = safeUser.Contains("\\") ? safeUser.Split('\\')[1] : safeUser;
%>

<script>
    // 儲存到 localStorage
    localStorage.setItem("loggedUser", "<%= cleanUser %>");

    // 跳轉到 user.html
    window.location.href = "user.html";
</script>

</body>
</html>
