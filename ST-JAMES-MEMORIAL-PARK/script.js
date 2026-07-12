function login() {

    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Administrator
    if(role === "admin"){

        if(username === "admin" && password === "admin123"){

            window.location.href = "admin.html";

        }else{

            alert("Invalid Administrator Username or Password.");

        }

    }

    // Visitor
    else if(role === "visitor"){

        if(username === "visitor" && password === "visitor123"){

            window.location.href = "user.html";

        }else{

            alert("Invalid Visitor Username or Password.");

        }

    }

    else{

        alert("Please select a role.");

    }

}