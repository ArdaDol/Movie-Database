function searchFilter() { location.href = `?${document.getElementById("filter_type").value}=${document.getElementById("filter_string").value}` }
function searchUser() { location.href = `?username=${document.getElementById("filter_string").value}` }