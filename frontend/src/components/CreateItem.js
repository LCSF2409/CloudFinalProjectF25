import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes, FaBox, FaTag, FaTruck, FaWarehouse, FaDollarSign } from 'react-icons/fa';
import { inventoryAPI } from '../services/api';
import { toast } from 'react-toastify';

const CreateItem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    productName: '',
    category: 'Accessories',
    supplier: '',
    stock: 'In stock',
    costUnit: '',
    warehouse: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [categories] = useState(['Accessories', 'Electronics', 'Furniture', 'Printing', 'Audio', 'Office', 'Storage']);

  useEffect(() => {
    // set focus on first input
    document.getElementById('productName')?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // format warehouse to uppercase
    if (name === 'warehouse') {
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    } else if (formData.productName.length > 100) {
      newErrors.productName = 'Product name cannot exceed 100 characters';
    }
    
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
    } else if (formData.supplier.length > 100) {
      newErrors.supplier = 'Supplier name cannot exceed 100 characters';
    }
    
    if (!formData.costUnit || parseFloat(formData.costUnit) <= 0) {
      newErrors.costUnit = 'Valid cost is required (must be greater than 0)';
    } else if (parseFloat(formData.costUnit) > 1000000) {
      newErrors.costUnit = 'Cost cannot exceed $1,000,000';
    }
    
    if (!formData.warehouse.trim()) {
      newErrors.warehouse = 'Warehouse is required';
    } else if (formData.warehouse.length > 20) {
      newErrors.warehouse = 'Warehouse code cannot exceed 20 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      
      // focus on first error field
      const firstErrorField = Object.keys(formErrors)[0];
      document.getElementById(firstErrorField)?.focus();
      
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        ...formData,
        costUnit: parseFloat(formData.costUnit)
      };
      
      await inventoryAPI.create(itemData);
      toast.success('Item created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating item:', error);
      // error is already handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(formData).some(key => formData[key] !== '' && 
        !(key === 'category' && formData[key] === 'Accessories') &&
        !(key === 'stock' && formData[key] === 'In stock'))) {
      if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  // auto-format warehouse input
  const formatWarehouse = (value) => {
    // remove any non-alphanumeric characters except dash
    const cleaned = value.replace(/[^A-Z0-9-]/gi, '');
    // ensure it starts with WH- if not already
    if (!cleaned.startsWith('WH-') && cleaned.length > 0) {
      return 'WH-' + cleaned.replace(/^WH-?/, '');
    }
    return cleaned;
  };

  return (
    <div className="create-item-page">
      {/* header */}
      <nav className="navbar">
        <div className="container">
          <div className="navbar-brand">
            <h1 className="logo">
              <FaBox /> Smart Inventory Tracker
            </h1>
          </div>
          <button onClick={handleCancel} className="back-btn">
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">
              <FaSave /> Create New Inventory Item
            </h2>
            <p className="form-subtitle">
              Fill in the details below to add a new item to your inventory
            </p>
          </div>

          <form onSubmit={handleSubmit} className="item-form">
            {/* product Name */}
            <div className="form-group">
              <label htmlFor="productName">
                <FaBox /> Product Name *
              </label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                className={errors.productName ? 'error' : ''}
                disabled={loading}
                maxLength={100}
              />
              {errors.productName && (
                <span className="field-error">{errors.productName}</span>
              )}
            </div>

            <div className="form-row">
              {/* category */}
              <div className="form-group">
                <label htmlFor="category">
                  <FaTag /> Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={errors.category ? 'error' : ''}
                  disabled={loading}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <span className="field-error">{errors.category}</span>
                )}
              </div>

              {/* supplier */}
              <div className="form-group">
                <label htmlFor="supplier">
                  <FaTruck /> Supplier *
                </label>
                <input
                  type="text"
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className={errors.supplier ? 'error' : ''}
                  disabled={loading}
                  maxLength={100}
                />
                {errors.supplier && (
                  <span className="field-error">{errors.supplier}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              {/* stock Status */}
              <div className="form-group">
                <label>Stock Status *</label>
                <div className="radio-group">
                  <label className={`radio-label ${formData.stock === 'In stock' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="stock"
                      value="In stock"
                      checked={formData.stock === 'In stock'}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span className="radio-custom in-stock"></span>
                    <span className="radio-text">In stock</span>
                  </label>
                  <label className={`radio-label ${formData.stock === 'Out of stock' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="stock"
                      value="Out of stock"
                      checked={formData.stock === 'Out of stock'}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span className="radio-custom out-of-stock"></span>
                    <span className="radio-text">Out of stock</span>
                  </label>
                </div>
              </div>

              {/* cost unit */}
              <div className="form-group">
                <label htmlFor="costUnit">
                  <FaDollarSign /> Cost per Unit ($) *
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="costUnit"
                    name="costUnit"
                    value={formData.costUnit}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="1000000"
                    className={errors.costUnit ? 'error' : ''}
                    disabled={loading}
                  />
                </div>
                {errors.costUnit && (
                  <span className="field-error">{errors.costUnit}</span>
                )}
              </div>
            </div>

            {/* warehouse */}
            <div className="form-group">
              <label htmlFor="warehouse">
                <FaWarehouse /> Warehouse *
              </label>
              <input
                type="text"
                id="warehouse"
                name="warehouse"
                value={formData.warehouse}
                onChange={(e) => {
                  const formatted = formatWarehouse(e.target.value);
                  handleChange({ target: { name: 'warehouse', value: formatted } });
                }}
                className={errors.warehouse ? 'error' : ''}
                disabled={loading}
                maxLength={20}
              />
              <div className="input-help">
                Format: WH-XXX (e.g., WH-001, WH-A01)
              </div>
              {errors.warehouse && (
                <span className="field-error">{errors.warehouse}</span>
              )}
            </div>

            {/* form Actions */}
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner-small"></span> Creating...
                  </>
                ) : (
                  <>
                    <FaSave /> Create Item
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="cancel-btn"
                disabled={loading}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateItem;