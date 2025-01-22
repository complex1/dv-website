const TOKEN = "NY05-4KB9-C5D0-P11N";
const HOSPITAL_CODE = "QDT";
const BRANCH_CODE = "QDT-51298A";
const BRANCH_NAME = "Bangalore";
const HOSPITAL_NAME = "QA Hospital";
const API_URL = "https://dev.flexehr.com";

const selectedDate = new Date().setHours(0, 0, 0, 0).valueOf();
const selectedTimeSlot = {
  startTime: 0,
  endTime: 0,
};
const timeSlotModal = new bootstrap.Modal(
  document.getElementById("timeSlotModal")
);

const setTimeSlotElement = document.getElementById("setTimeSlot");
const dateSelectComponent = document.getElementById("doctorDate");
const validationErrorElement = document.getElementById("validationError");
const submitButton = document.getElementById("submitAppointment");
validationErrorElement.style.display = "none";
const notyf = new Notyf({
  duration: 5000,
  position: {
    x: 'right',
    y: 'top',
  }
});

// set todays date
dateSelectComponent.value = new Date().toISOString().split("T")[0];

setTimeSlotElement.addEventListener("click", () => {
  timeSlotModal.show();
  loadTimeSlots();
});

dateSelectComponent.addEventListener("change", () => {
  loadTimeSlots();
});

const getTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hours % 12}:${minutes} ${ampm}`;
};

const loadDoctorsList = async () => {
  const res = await fetch(`${API_URL}/api/doctor/all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${TOKEN}`,
    },
    body: JSON.stringify({
      hospitalCode: HOSPITAL_CODE,
      branchCode: BRANCH_CODE,
    }),
  });
  const JsonResponse = await res.json();
  const data = JsonResponse.responseObject;
  const doctorSelect = document.getElementById("doctorList");

  data.forEach((doctor, index) => {
    const option = document.createElement("option");
    option.value = doctor.userCode;
    option.text = `${doctor.hospitalUserName.nameTitle || ""} ${doctor.hospitalUserName.firstName || ""
      } ${doctor.hospitalUserName.lastName || ""}`.trim();
    doctorSelect.appendChild(option);
    if (index === 0) {
      option.selected = true;
    }
  });

  doctorSelect.addEventListener("change", (e) => {
    selectedTimeSlot.startTime = 0;
    selectedTimeSlot.endTime = 0;
  });
};

const loadTimeSlots = async () => {
  const doctorDropdown = document.getElementById("doctorList");
  const timeSlotContainer = document.getElementById("timeSlotContainer");
  const doctorCode = doctorDropdown.value;
  const selectedDate = new Date(dateSelectComponent.value)
    .setHours(0, 0, 0, 0)
    .valueOf();
  let html = `<div class="d-flex justify-content-center w-100 m-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>`;
  timeSlotContainer.innerHTML = html;

  const res = await fetch(`${API_URL}/api/doctor/slots/available`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${TOKEN}`,
    },
    body: JSON.stringify({
      hospitalCode: HOSPITAL_CODE,
      branchCode: BRANCH_CODE,
      doctorCode,
      epochDate: selectedDate,
    }),
  });

  const JsonResponse = await res.json();

  const data = JsonResponse.responseObject;

  html = data
    .map(
      (slot) => `
  <button type="button" class="slot-btn btn btn-outline-primary m-2 ${
    slot.startTime === selectedTimeSlot.startTime ? 'slot-btn-selected' : ''
  }  ${slot.booked || slot.unavailable ? "disabled" : ""
        }" data-start-time="${slot.startTime}" data-end-time="${slot.endTime}" ${slot.booked || slot.unavailable ? "disabled" : ""
        } style="width: 200px; ">
    ${getTime(slot.startTime)} - ${getTime(slot.endTime)}
  </button>`
    )
    .join("");

  if (data.length === 0) {
    html = `<div class"pt-4">
      <div class="alert alert-warning mt-4" role="alert">
        No slots available for the selected date. Please select another date.
      </div>
    </div>`;
  }

  timeSlotContainer.innerHTML = html;
  const timeSlotButtons = document.querySelectorAll("#timeSlotModal .btn");
  timeSlotButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      if (e.target.classList.contains("disabled")) {
        return;
      }
      if (e.target.classList.contains("slot-btn")) {
        selectedTimeSlot.startTime = Number(e.target.dataset.startTime);
        selectedTimeSlot.endTime = Number(e.target.dataset.endTime);
        const appointmentString = `${new Date(
          selectedDate
        ).toDateString()} ${getTime(selectedTimeSlot.startTime)}`;
        setTimeSlotElement.innerHTML = `<button type="button" class="btn btn-outline-success disabled" style="width: 100%;">${appointmentString}</button>`;
      }
      timeSlotModal.hide();
    });
  });
};

const validate = (body) => {
  const errorMessage = [];

  if (body.nameTitle === "" || body.nameTitle === null) {
    errorMessage.push("Please select name title");
  }
  if (body.fullName?.trim() === "" || body.fullName === null) {
    errorMessage.push("Please enter your name.");
  }
  if (body.phoneNumber?.trim() === "" || body.phoneNumber === null) {
    errorMessage.push("Phone number is required");
  } else if (body.phoneNumber?.trim().length < 10) {
    errorMessage.push("Phone number must be 10 digits");
  }
  if (!body.doctorCode) {
    errorMessage.push("Doctor is required");
  }
  if (body.startTime === 0 || body.endTime === 0) {
    errorMessage.push("Appointment time is required");
  }
  return errorMessage;
};

const getRequestBody = (body) => {
  const nameObject = {
    nameTitle: body.nameTitle,
    firstName: "",
    middleName: "",
    lastName: "",
  };

  const nameArray = body.fullName.trim().split(" ");
  if (nameArray.length === 1) {
    nameObject.firstName = nameArray[0];
  } else if (nameArray.length === 2) {
    nameObject.firstName = nameArray[0];
    nameObject.lastName = nameArray[1];
  } else if (nameArray.length > 2) {
    nameObject.firstName = nameArray.slice(0, nameArray.length - 1).join(" ");
    nameObject.lastName = nameArray[nameArray.length - 1];
  }

  return {
    hospitalCode: HOSPITAL_CODE,
    branchCode: BRANCH_CODE,
    branchName: BRANCH_NAME,
    hospitalName: HOSPITAL_NAME,
    patientMobileNumber: body.phoneNumber,
    patientName: nameObject,
    suggestedDate: selectedDate,
    doctorCode: body.doctorCode,
    startTime: body.startTime,
    endTime: body.endTime,
  };
};

submitButton.addEventListener("click", async (e) => {
  e.preventDefault();
  const _form = document.getElementById("appointmentBooking");
  const form = new FormData(_form);
  const nameTitle = form.get("nameTitle") || "";
  const fullName = form.get("fullName") || "";
  const phoneNumber = form.get("phoneNumber") || "";
  const doctorCode = form.get("doctorCode") || "";
  const startTime = selectedTimeSlot.startTime || 0;
  const endTime = selectedTimeSlot.endTime || 0;
  const data = {
    nameTitle,
    fullName,
    phoneNumber,
    doctorCode,
    startTime,
    endTime,
  };
  const errors = validate(data);

  const mask = document.createElement('div')
  mask.classList.add('flex-mask')
  document.body.append(mask)

  if (errors.length) {
    validationErrorElement.style.display = "block";
    validationErrorElement.innerHTML = `<ul>${errors
      .map((error) => `<li>${error}</li>`)
      .join("")}</ul>`;
    return;
  }
  validationErrorElement.style.display = "none";

  const requestBody = getRequestBody(data);

  e.target.disabled = true;
  e.target.classList.add('disabled')
  await fetch(`${API_URL}/api/suggested/opd/appointment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${TOKEN}`,
    },
    body: JSON.stringify(requestBody),
  });
  notyf.success('We have received your request to book an appointment.');
  _form.querySelectorAll('input').forEach(item => item.value = '')
  dateSelectComponent.value = new Date().toISOString().split("T")[0];
  e.target.disabled = false;
  e.target.classList.remove('disabled')
  selectedTimeSlot.startTime = 0;
  selectedTimeSlot.endTime = 0;
  setTimeSlotElement.innerHTML = `<a class="nav-link active" aria-current="page" href="#" onclick="return false;">Select Slot</a>`;
  mask.remove()
});

loadDoctorsList();
